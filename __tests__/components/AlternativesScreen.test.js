const { scoreToBand, limitAlternativesByTier } = require('../../src/screens/app/AlternativesScreen');

test('scoreToBand maps score ranges', () => {
  expect(scoreToBand(80)).toBe('green');
  expect(scoreToBand(50)).toBe('yellow');
  expect(scoreToBand(20)).toBe('red');
});

test('free tier only gets 1 alternative', () => {
  const items = [{}, {}, {}];
  expect(limitAlternativesByTier(items, 'free')).toHaveLength(1);
  expect(limitAlternativesByTier(items, 'premium')).toHaveLength(3);
});
