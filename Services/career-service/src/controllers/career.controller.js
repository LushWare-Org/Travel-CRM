import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendApplicantConfirmation, sendAdminApplicationNotice, sendApplicationStatusUpdate } from '../utils/email.js';

export const applyForPosition = asyncHandler(async (req, res) => {
  const { fullName, email, phone, position, coverLetter, agreeTerms, resumeUrl, resumeFileName } = req.body;

  if (!fullName || !email || !phone || !position || !coverLetter || !agreeTerms) {
    throw new AppError('Please fill in all required fields', 400);
  }
  if (!resumeUrl) throw new AppError('Please upload your resume', 400);

  const cleanPosition = position.trim();
  const cleanEmail = email.trim().toLowerCase();

  const vacancy = await prisma.vacancy.findFirst({
    where: { position: { equals: cleanPosition, mode: 'insensitive' }, status: 'active' },
  });
  if (!vacancy) throw new AppError('Invalid position or position is no longer available', 400);

  const existing = await prisma.career.findFirst({
    where: { email: cleanEmail, position: { equals: cleanPosition, mode: 'insensitive' } },
  });
  if (existing) throw new AppError(`You have already applied for ${cleanPosition}. Please wait for our response.`, 400);

  const application = await prisma.career.create({
    data: {
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      position: vacancy.position,
      coverLetter: coverLetter.trim(),
      agreeTerms,
      resumeUrl,
      resumeFileName: resumeFileName || 'resume',
      status: 'pending',
    },
  });

  await prisma.vacancy.update({ where: { id: vacancy.id }, data: { applicationsCount: { increment: 1 } } });

  // Send confirmation email (non-blocking)
  sendApplicantConfirmation({ to: cleanEmail, fullName, position: vacancy.position })
    .catch((err) => req.log.error({ err, email: cleanEmail }, 'Failed to send applicant confirmation email'));

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
  if (adminEmails.length) {
    sendAdminApplicationNotice({
      to: adminEmails,
      fullName,
      position: vacancy.position,
      email: cleanEmail,
      phone: phone?.trim(),
      resumeUrl,
    }).catch((err) => req.log.error({ err }, 'Failed to send admin notification email'));
  } else {
    req.log.warn('ADMIN_EMAILS is not configured — skipping admin notification email');
  }

  res.status(201).json({ status: 'success', message: 'Application submitted successfully!', data: { application } });
});

export const getCareerApplications = asyncHandler(async (req, res) => {
  const { status, position, sortBy = 'createdAt', page = 1, limit = 10 } = req.query;
  const where = {};
  if (status) where.status = status;
  if (position) where.position = { contains: position, mode: 'insensitive' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [applications, total] = await Promise.all([
    prisma.career.findMany({ where, skip, take: parseInt(limit), orderBy: { [sortBy === '-createdAt' ? 'createdAt' : sortBy.replace('-', '')]: sortBy.startsWith('-') ? 'desc' : 'asc' } }),
    prisma.career.count({ where }),
  ]);

  res.json({ status: 'success', data: { applications, pagination: { total, pages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page), limit: parseInt(limit) } } });
});

export const getApplicationDetails = asyncHandler(async (req, res) => {
  const application = await prisma.career.findUnique({ where: { id: req.params.id } });
  if (!application) throw new AppError('Application not found', 404);
  res.json({ status: 'success', data: { application } });
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes, rating, feedback } = req.body;
  const validStatuses = ['pending', 'under-review', 'shortlisted', 'rejected', 'hired'];
  if (status && !validStatuses.includes(status)) throw new AppError('Invalid status', 400);

  const application = await prisma.career.findUnique({ where: { id: req.params.id } });
  if (!application) throw new AppError('Application not found', 404);

  const updated = await prisma.career.update({
    where: { id: req.params.id },
    data: {
      ...(status && { status }),
      ...(adminNotes && { adminNotes }),
      reviewedById: req.user.id,
      reviewedAt: new Date(),
    },
  });

  // Send notification email for terminal statuses (non-blocking)
  if (status && status !== 'pending') {
    sendApplicationStatusUpdate({
      to: application.email,
      fullName: application.fullName,
      position: application.position,
      status,
      feedback,
    }).catch((err) => req.log.error({ err, email: application.email }, 'Failed to send application status email'));
  }

  res.json({ status: 'success', message: 'Application updated', data: { application: updated } });
});

export const getCareerStats = asyncHandler(async (req, res) => {
  const [total, byStatus] = await Promise.all([
    prisma.career.count(),
    prisma.career.groupBy({ by: ['status'], _count: true }),
  ]);
  res.json({ status: 'success', data: { total, byStatus } });
});

export const deleteApplication = asyncHandler(async (req, res) => {
  const application = await prisma.career.findUnique({ where: { id: req.params.id } });
  if (!application) throw new AppError('Application not found', 404);
  await prisma.career.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', message: 'Application deleted' });
});

export const searchApplications = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim().length < 2) throw new AppError('Please enter at least 2 characters', 400);

  const applications = await prisma.career.findMany({
    where: {
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { position: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
  });
  res.json({ status: 'success', data: { applications } });
});
