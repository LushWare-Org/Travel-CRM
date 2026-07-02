export default (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  console.error(`[auth-service] ${err.message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
