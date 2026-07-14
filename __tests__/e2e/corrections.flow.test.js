const { correctionTypes, buildCorrectionPayload } = require('../../src/screens/app/CorrectionScreen');

test('corrections flow supports expected correction types', () => {
  expect(correctionTypes).toContain('fix_ingredients');
});

test('corrections flow builds API payload safely', () => {
  const payload = buildCorrectionPayload({ barcode: '123', type: 'other_issue', description: 'Mismatch', source: 'label' });
  expect(payload.nutrition).toBeNull();
});
