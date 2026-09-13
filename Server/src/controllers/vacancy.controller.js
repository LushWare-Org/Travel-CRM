import Vacancy from '../models/vacancy.model.js';
import Career from '../models/career.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

export const createVacancy = asyncHandler(async (req, res, next) => {
  const {
    position,
    description,
    type,
    location,
    salary,
    requirements,
    benefits,
    experience,
    qualifications,
    skills,
    closingDate,
    notes,
  } = req.body;
  if (!position || !description || !location) {
    return next(new AppError('Please fill in all required fields', 400));
  }

  const vacancy = await Vacancy.create({
    position,
    description,
    type: type || 'Full Time',
    location,
    salary: salary || {},
    requirements: requirements || [],
    benefits: benefits || [],
    experience: experience || { min: 0 },
    qualifications: qualifications || [],
    skills: skills || [],
    closingDate,
    notes,
    status: 'draft',
    createdBy: req.user._id,
  });

  res.status(201).json({
    status: 'success',
    message: 'Vacancy created successfully',
    data: { vacancy },
  });
});

export const getVacancies = asyncHandler(async (req, res, next) => {
  const { status = 'active', sortBy = '-createdAt', page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const vacancies = await Vacancy.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-notes -createdBy')
    .lean();

  const total = await Vacancy.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    data: {
      vacancies,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
});


export const getVacancyById = asyncHandler(async (req, res, next) => {
  const vacancy = await Vacancy.findById(req.params.id);

  if (!vacancy) {
    return next(new AppError('Vacancy not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { vacancy },
  });
});


export const updateVacancy = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = [
    'position',
    'description',
    'type',
    'location',
    'salary',
    'requirements',
    'benefits',
    'experience',
    'qualifications',
    'skills',
    'status',
    'closingDate',
    'notes',
  ];

  const filteredUpdates = {};
  allowedFields.forEach(field => {
    if (updates.hasOwnProperty(field)) {
      filteredUpdates[field] = updates[field];
    }
  });

  const vacancy = await Vacancy.findByIdAndUpdate(id, filteredUpdates, {
    new: true,
    runValidators: true,
  });

  if (!vacancy) {
    return next(new AppError('Vacancy not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Vacancy updated successfully',
    data: { vacancy },
  });
});


export const deleteVacancy = asyncHandler(async (req, res, next) => {
  const vacancy = await Vacancy.findByIdAndDelete(req.params.id);

  if (!vacancy) {
    return next(new AppError('Vacancy not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Vacancy deleted successfully',
  });
});

export const getAdminVacancies = asyncHandler(async (req, res, next) => {
  const { sortBy = '-createdAt', page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  let vacancies = await Vacancy.find({})
    .sort(sortBy)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('createdBy', 'name email')
    .lean();

  vacancies = await Promise.all(
    vacancies.map(async (vacancy) => {
      const applicationCount = await Career.countDocuments({
        position: vacancy.position
      });
      return {
        ...vacancy,
        applicationsCount: applicationCount
      };
    })
  );

  const total = await Vacancy.countDocuments({});

  res.status(200).json({
    status: 'success',
    data: {
      vacancies,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
});
