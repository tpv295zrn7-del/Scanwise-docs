const DEFAULT_COLORS = {
  primary: '#10B981',
  accent: '#007AFF',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  error: '#DC2626',
  warning: '#F59E0B',
  success: '#10B981'
};

const createColors = (overrides = {}) => ({ ...DEFAULT_COLORS, ...overrides });

module.exports = { DEFAULT_COLORS, createColors };
