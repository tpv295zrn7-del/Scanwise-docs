const events = [];

const trackEvent = (name, payload = {}) => {
  const sanitized = { ...payload };
  delete sanitized.email;
  delete sanitized.phone;
  events.push({ name, payload: sanitized });
};

const getTrackedEvents = () => [...events];

module.exports = { trackEvent, getTrackedEvents };
