import multer from 'multer';
import path from 'path';
import os from 'os';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image files are allowed'));
};

export const uploadSingle = (fieldName) =>
  multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }).single(fieldName);

export const uploadMultiple = (fieldName, maxCount = 10) =>
  multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }).array(fieldName, maxCount);
