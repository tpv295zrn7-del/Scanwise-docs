const { createColors } = require('./colors');
const spacing = require('./spacing');
const typography = require('./typography');

const createTheme = (colorOverrides = {}) => ({
  colors: createColors(colorOverrides),
  spacing,
  typography
});

module.exports = { createTheme };
