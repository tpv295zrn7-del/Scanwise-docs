const { createPermissionsService, PERMISSION_TYPES } = require('../../src/services/permissions');

test('requests camera permission and tracks analytics', async () => {
  const track = jest.fn();
  const service = createPermissionsService({
    platform: 'android',
    analytics: { track },
    adapter: {
      check: jest.fn().mockResolvedValue(false),
      request: jest.fn().mockResolvedValue(true),
    },
  });

  const granted = await service.requestPermission(PERMISSION_TYPES.CAMERA);

  expect(granted).toBe(true);
  expect(track).toHaveBeenCalledWith('permission_granted', expect.objectContaining({ permissionType: 'camera' }));
});

test('returns feature availability map', async () => {
  const service = createPermissionsService({
    platform: 'ios',
    adapter: {
      check: jest.fn().mockResolvedValue(true),
      request: jest.fn().mockResolvedValue(true),
    },
  });

  const map = await service.getFeatureAvailability();
  expect(map.scan.enabled).toBe(true);
  expect(map.upload.enabled).toBe(true);
  expect(map.nearbyResources.enabled).toBe(true);
});
