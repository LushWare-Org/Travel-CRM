import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getVacancies = asyncHandler(async (req, res) => {
  const vacancies = await prisma.vacancy.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ status: 'success', data: vacancies });
});

export const getAdminVacancies = asyncHandler(async (req, res) => {
  const vacancies = await prisma.vacancy.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ status: 'success', data: vacancies });
});

export const createVacancy = asyncHandler(async (req, res) => {
  const { position, description, type, location, experienceMin, closingDate, status } = req.body;
  if (!position || !description || !location) throw new AppError('Position, description, and location are required', 400);

  const vacancy = await prisma.vacancy.create({
    data: {
      position: position.trim(),
      description: description.trim(),
      type: type || 'Full_Time',
      location: location.trim(),
      experienceMin: parseInt(experienceMin) || 0,
      status: status || 'draft',
      closingDate: closingDate ? new Date(closingDate) : null,
      createdById: req.user.id,
    },
  });
  res.status(201).json({ status: 'success', data: vacancy });
});

export const getVacancyById = asyncHandler(async (req, res) => {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: req.params.id } });
  if (!vacancy) throw new AppError('Vacancy not found', 404);
  res.json({ status: 'success', data: vacancy });
});

export const updateVacancy = asyncHandler(async (req, res) => {
  const { position, description, type, location, experienceMin, closingDate, status } = req.body;
  const vacancy = await prisma.vacancy.update({
    where: { id: req.params.id },
    data: {
      ...(position && { position: position.trim() }),
      ...(description && { description: description.trim() }),
      ...(type && { type }),
      ...(location && { location: location.trim() }),
      ...(experienceMin !== undefined && { experienceMin: parseInt(experienceMin) }),
      ...(status && { status }),
      ...(closingDate !== undefined && { closingDate: closingDate ? new Date(closingDate) : null }),
    },
  });
  res.json({ status: 'success', data: vacancy });
});

export const deleteVacancy = asyncHandler(async (req, res) => {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: req.params.id } });
  if (!vacancy) throw new AppError('Vacancy not found', 404);
  await prisma.vacancy.delete({ where: { id: req.params.id } });
  res.json({ status: 'success', message: 'Vacancy deleted' });
});
