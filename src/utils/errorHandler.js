const sanitizeErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  const message = String(error.message || error);
  return message.replace(/token\s+[^\s]+/gi, 'token [redacted]');
};

module.exports = { sanitizeErrorMessage };
