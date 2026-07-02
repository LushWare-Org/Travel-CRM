import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

const cpInclude = { images: true };

export const createWebsiteCustomizedPackage = asyncHandler(async (req, res) => {
  const { images = [], ...body } = req.body;
  const cp = await prisma.customizedPackage.create({
    data: {
      ...body,
      images: { create: images.map((img, idx) => ({ ...img, order: idx })) },
    },
    include: cpInclude,
  });
  res.status(201).json({ success: true, data: cp });
});

export const getCustomizedPackageById = asyncHandler(async (req, res) => {
  const cp = await prisma.customizedPackage.findUnique({ where: { id: req.params.id }, include: cpInclude });
  if (!cp) throw new AppError('Customized package not found', 404);
  res.json({ success: true, data: cp });
});

export const updateCustomizedPackage = asyncHandler(async (req, res) => {
  const existing = await prisma.customizedPackage.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Customized package not found', 404);
  const { images, ...body } = req.body;
  const data = { ...body };
  if (images) {
    await prisma.customizedPackageImage.deleteMany({ where: { customizedPackageId: req.params.id } });
    data.images = { create: images.map((img, idx) => ({ ...img, order: idx })) };
  }
  const cp = await prisma.customizedPackage.update({ where: { id: req.params.id }, data, include: cpInclude });
  res.json({ success: true, data: cp });
});

export const getUserCustomizedPackages = asyncHandler(async (req, res) => {
  const data = await prisma.customizedPackage.findMany({
    where: { customizedById: req.user.id },
    include: cpInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data });
});
