// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * pdf-lib depends on tslib 1.x, whose package "exports" send Metro's `import`
 * condition to an ES wrapper that default-imports the CommonJS build. Metro
 * can't interop that, so the bundle dies at launch with
 * "Cannot destructure property '__extends' of ... as it is undefined".
 * Pointing every tslib import at the plain CommonJS file sidesteps it.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    const origin = context.originModulePath;
    return {
      type: 'sourceFile',
      // Node's own resolution picks the CommonJS build (the "default" export).
      filePath: require.resolve('tslib', { paths: [origin] }),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
