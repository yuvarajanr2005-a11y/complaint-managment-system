function errorHandler(error, req, res, next) {
  const status = error.status || error.statusCode || 500;
  if (status >= 500) {
    console.error('Server Error:', error);
  }

  let message = error.message;
  if (status === 413) {
    message = 'Request is too large. Please use an image that is 2 MB or smaller.';
  } else if (status >= 500) {
    message = 'Something went wrong. Please try again.';
  }

  res.status(status).json({ message });
}

module.exports = errorHandler;
