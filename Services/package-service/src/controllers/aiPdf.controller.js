import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { generatePackagePDF } from '../utils/packagePDFGenerator.js';

export const downloadAIPdf = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pkg = await prisma.package.findUnique({
    where: { id },
    include: {
      itineraryDays: {
        orderBy: { dayNumber: 'asc' },
        include: { places: { include: { place: true } }, activities: { include: { activity: true } }, transports: true },
      },
    },
  });
  if (!pkg) throw new AppError('Package not found', 404);

  const buffer = await generatePackagePDF(pkg);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="package-${id}.pdf"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});
