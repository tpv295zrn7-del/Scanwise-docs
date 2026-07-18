/**
 * Centralized permissions service.
 */

const PLATFORM = Object.freeze({
  IOS: 'ios',
  ANDROID: 'android',
});

const PERMISSION_TYPES = Object.freeze({
  CAMERA: 'camera',
  PHOTO_LIBRARY: 'photo_library',
  LOCATION: 'location',
});

const PERMISSIONS = Object.freeze({
  ios: Object.freeze({
    camera: 'ios.permission.CAMERA',
    photo_library: 'ios.permission.PHOTO_LIBRARY',
    location: 'ios.permission.LOCATION_WHEN_IN_USE',
  }),
  android: Object.freeze({
    camera: 'android.permission.CAMERA',
    photo_library: 'android.permission.READ_MEDIA_IMAGES',
    location: 'android.permission.ACCESS_FINE_LOCATION',
  }),
});

const MANIFEST_DECLARATIONS = Object.freeze({
  ios: Object.freeze([
    'NSCameraUsageDescription',
    'NSPhotoLibraryUsageDescription',
    'NSLocationWhenInUseUsageDescription',
  ]),
  android: Object.freeze([
    'android.permission.CAMERA',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.ACCESS_FINE_LOCATION',
  ]),
});

const FEATURES = Object.freeze({
  scan: PERMISSION_TYPES.CAMERA,
  upload: PERMISSION_TYPES.PHOTO_LIBRARY,
  nearbyResources: PERMISSION_TYPES.LOCATION,
});

const DEFAULT_RATIONALE = Object.freeze({
  camera: 'Camera access is required to scan product labels and barcodes.',
  photo_library: 'Photo library access is required to upload existing label photos.',
  location: 'Location access helps find nearby resources and safe alternatives.',
});

/**
 * @param {Object} options
 * @param {'ios'|'android'} [options.platform]
 * @param {{check: Function, request: Function}} options.adapter
 * @param {{track?: Function}} [options.analytics]
 * @param {(payload: {type: string, message: string}) => Promise<boolean> | boolean} [options.showRationale]
 */
const createPermissionsService = (options = {}) => {
  const platform = options.platform || PLATFORM.ANDROID;
  const adapter = options.adapter || {
    check: async () => false,
    request: async () => false,
  };
  const analytics = options.analytics || {};
  const showRationale = options.showRationale || (() => true);

  /**
   * @param {string} permissionType
   */
  const getPermissionKey = (permissionType) => {
    const key = PERMISSIONS[platform]?.[permissionType];
    if (!key) {
      throw new Error(`Unsupported permission type: ${permissionType}`);
    }
    return key;
  };

  /**
   * @param {string} permissionType
   */
  const hasPermission = async (permissionType) => {
    const permission = getPermissionKey(permissionType);
    const granted = Boolean(await adapter.check(permission));

    if (typeof analytics.track === 'function') {
      analytics.track('permission_check', {
        permissionType,
        granted,
        platform,
      });
    }

    return granted;
  };

  /**
   * @param {string} permissionType
   * @param {{explanation?: string}} [requestOptions]
   */
  const requestPermission = async (permissionType, requestOptions = {}) => {
    const permission = getPermissionKey(permissionType);
    const rationaleMessage = requestOptions.explanation || DEFAULT_RATIONALE[permissionType] || 'Permission required.';
    const shouldContinue = await showRationale({ type: permissionType, message: rationaleMessage });

    if (!shouldContinue) {
      if (typeof analytics.track === 'function') {
        analytics.track('permission_denied', { permissionType, platform, source: 'rationale_cancelled' });
      }
      return false;
    }

    const granted = Boolean(await adapter.request(permission));
    if (typeof analytics.track === 'function') {
      analytics.track(granted ? 'permission_granted' : 'permission_denied', {
        permissionType,
        platform,
        source: 'request',
      });
    }

    return granted;
  };

  const getFeatureAvailability = async () => {
    const result = {};
    const featureNames = Object.keys(FEATURES);

    for (let index = 0; index < featureNames.length; index += 1) {
      const feature = featureNames[index];
      const permissionType = FEATURES[feature];
      result[feature] = {
        enabled: await hasPermission(permissionType),
        reason: DEFAULT_RATIONALE[permissionType],
      };
    }

    return result;
  };

  return {
    platform,
    manifestDeclarations: MANIFEST_DECLARATIONS[platform],
    getPermissionKey,
    hasPermission,
    requestPermission,
    getFeatureAvailability,
  };
};

module.exports = {
  PLATFORM,
  PERMISSION_TYPES,
  PERMISSIONS,
  MANIFEST_DECLARATIONS,
  FEATURES,
  DEFAULT_RATIONALE,
  createPermissionsService,
};
