// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

// react-native-game-engine's DefaultTouchProcessor imports `rxjs`. On the
// web platform, Metro's resolverMainFields includes "module", so it prefers
// rxjs's ESM5 build — whose bundled tslib interop breaks under Metro's CJS
// transform ("Cannot destructure property '__extends' of 'tslib.default'").
// iOS/Android don't hit this: their mainFields list has no "module" entry,
// so they already resolve rxjs's plain CJS build, which doesn't touch
// tslib at all. Force the same CJS resolution on web.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && (moduleName === "rxjs" || moduleName === "rxjs/operators")) {
    return context.resolveRequest({ ...context, mainFields: ["main"] }, moduleName, platform);
  }
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  return resolve(context, moduleName, platform);
};

module.exports = config;
