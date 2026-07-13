const isBarcode = (value) => /^\d{8,14}$/.test(String(value || ''));
const required = (value) => value !== undefined && value !== null && String(value).trim() !== '';

module.exports = { isBarcode, required };
