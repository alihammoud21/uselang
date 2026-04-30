/**
 * react-native.config.js
 *
 * react-native-reanimated 3.17.x bundles worklets natively inside its own pod.
 * The standalone react-native-worklets package is only needed for Babel.
 * Linking it natively would produce duplicate symbol linker errors, so we
 * disable its iOS (and Android) native autolinking here.
 */
module.exports = {
  dependencies: {
    "react-native-worklets": {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
