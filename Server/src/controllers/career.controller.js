import Career from '../models/career.model.js';
import Vacancy from '../models/vacancy.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import emailService from '../utils/emailService.js';

export const applyForPosition = asyncHandler(async (req, res, next) => {
  const {
    fullName, email, phone, position, coverLetter, agreeTerms, resumeUrl, resumeFileName,
  } = req.body;

  console.log('📝 [Career] Application received:', {
    fullName, email, position, hasResume: !!resumeUrl,
  });

  // 1. Basic Validation
  if (!fullName || !email || !phone || !position || !coverLetter || !agreeTerms) {
    return next(new AppError('Please fill in all required fields', 400));
  }

  if (!resumeUrl) {
    return next(new AppError('Please upload your resume', 400));
  }

  const cleanPosition = position.trim();
  const cleanEmail = email.trim().toLowerCase();

  // 2. Vacancy Validation (Case Insensitive)
  const vacancy = await Vacancy.findOne({
    position: { $regex: new RegExp(`^${cleanPosition}$`, 'i') },
    status: 'active',
  });

  if (!vacancy) {
    console.warn(`⚠️ [Career] Invalid vacancy applied for: "${cleanPosition}"`);
    return next(new AppError('Invalid position selected or position is no longer available', 400));
  }

  // 3. Duplicate Application Check
  const existingApplication = await Career.findOne({
    email: cleanEmail,
    position: { $regex: new RegExp(`^${cleanPosition}$`, 'i') },
  });

  if (existingApplication) {
    return next(
      new AppError(
        `You have already applied for ${cleanPosition}. Please wait for our response.`,
        400,
      ),
    );
  }

  try {
    const careerApplication = new Career({
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      position: vacancy.position, // Use canonical position name from DB
      coverLetter: coverLetter.trim(),
      agreeTerms,
      resume: {
        url: resumeUrl,
        fileName: resumeFileName || 'resume',
      },
      status: 'pending',
    });

    await careerApplication.save();
    console.log('✅ [Career] Application saved:', careerApplication._id);

    // Send emails using the standard EmailService
    try {
      // 1. Send confirmation to applicant
      await emailService.sendEmail({
        to: cleanEmail,
        subject: `Application Received - ${vacancy.position} Position`,
        html: emailService.getEmailTemplate(`
          <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">Thank you for applying! 🎉</h1>
          <p style="color: #333333; font-size: 16px; line-height: 1.6;">Dear ${fullName},</p>
          <p style="color: #333333; font-size: 16px; line-height: 1.6;">We have received your application for the <strong>${vacancy.position}</strong> position.</p>
          <p style="color: #333333; font-size: 16px; line-height: 1.6;">Our team will review your application and get back to you within 5-7 business days.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Position:</strong> ${vacancy.position}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${cleanEmail}</p>
          </div>
        `),
      });

      // 2. Send notification to admin(s)
      const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [process.env.EMAIL_USER];
      const managementUrl = `${process.env.MANAGEMENT_URL || 'http://localhost:3001'}`;

      await emailService.sendEmail({
        to: adminEmails.join(','),
        subject: `New Career Application - ${vacancy.position}`,
        html: emailService.getEmailTemplate(`
          <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">New Application Received 📄</h1>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${fullName}</p>
            <p style="margin: 5px 0;"><strong>Position:</strong> ${vacancy.position}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${cleanEmail}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${phone}</p>
            <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            ${emailService.getButton('Review Application', `${managementUrl}/career`)}
          </div>
        `),
      });
    } catch (emailErr) {
      console.error('⚠️ [Career] Email notification failed (non-blocking):', emailErr);
    }

    res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully! We will review it soon.',
      data: {
        application: careerApplication,
      },
    });
  } catch (error) {
    console.error('❌ [Career] Application saving error:', error);
    // Pass the actual error if it's Mongoose validation related, otherwise generic
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return next(new AppError(messages.join('. '), 400));
    }
    return next(new AppError('Failed to submit application. Please try again.', 500));
  }
});

export const getCareerApplications = asyncHandler(async (req, res, next) => {
  const {
    status, position, sortBy = '-createdAt', page = 1, limit = 10,
  } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (position) filter.position = position;

  const skip = (page - 1) * limit;

  const applications = await Career.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('reviewedBy', 'name email');

  const total = await Career.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    data: {
      applications,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
});

export const getApplicationDetails = asyncHandler(async (req, res, next) => {
  const application = await Career.findById(req.params.id).populate(
    'reviewedBy',
    'name email',
  );

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      application,
    },
  });
});

export const updateApplicationStatus = asyncHandler(async (req, res, next) => {
  const {
    status, adminNotes, rating, feedback,
  } = req.body;

  const validStatuses = ['pending', 'under-review', 'shortlisted', 'rejected', 'hired'];

  if (status && !validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const application = await Career.findById(req.params.id);

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  // Update fields
  if (status) {
    application.status = status;
  }
  if (adminNotes) {
    application.adminNotes = adminNotes;
  }
  if (rating !== undefined) {
    application.rating = rating;
  }
  if (feedback) {
    application.feedback = feedback;
  }

  application.reviewedBy = req.user._id;
  application.reviewedAt = new Date();

  await application.save();

  // Send email if status changed (and isn't pending)
  if (status && status !== 'pending' && status !== 'under-review') {
    try {
      const statusMessages = {
        'under-review': 'Your application is under review. We will update you soon.',
        shortlisted: 'Congratulations! Your application has been shortlisted.',
        rejected: 'Thank you for applying. Unfortunately, we cannot proceed with your application at this time.',
        hired: 'Congratulations! We are pleased to offer you the position.',
      };

      await emailService.sendEmail({
        to: application.email,
        subject: `Update on Your ${application.position} Application`,
        html: emailService.getEmailTemplate(`
                <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">Application Status Update</h1>
                <p style="color: #333333; font-size: 16px; line-height: 1.6;">Dear ${application.fullName},</p>
                <p style="color: #333333; font-size: 16px; line-height: 1.6;">${statusMessages[status] || 'Your application status has been updated.'}</p>
                ${application.feedback ? `
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
                    <h4 style="margin: 0 0 10px 0;">Feedback:</h4>
                    <p style="margin: 0;">${application.feedback}</p>
                </div>
                ` : ''}
            `),
      });

      application.emailSent = true;
      application.emailSentAt = new Date();
      await application.save(); // Save the email sent status
    } catch (emailErr) {
      console.error('⚠️ [Career] Status update email failed:', emailErr);
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Application updated successfully',
    data: {
      application,
    },
  });
});

export const getCareerStats = asyncHandler(async (req, res, next) => {
  const stats = await Career.aggregate([
    {
      $facet: {
        totalApplications: [{ $count: 'count' }],
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ],
        pendingCount: [
          { $match: { status: 'pending' } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: stats[0],
  });
});

export const deleteApplication = asyncHandler(async (req, res, next) => {
  const application = await Career.findById(req.params.id);

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  await Career.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Application deleted successfully',
  });
});

export const searchApplications = asyncHandler(async (req, res, next) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return next(new AppError('Please enter at least 2 characters to search', 400));
  }

  const applications = await Career.find({
    $or: [
      { fullName: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
      { position: { $regex: query, $options: 'i' } },
    ],
  }).limit(20);

  res.status(200).json({
    status: 'success',
    data: {
      applications,
    },
  });
});
