const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/** Metro sees web/src/lib, the TypeScript both doors share, and the workspace's package store, where pnpm keeps what
 * ios/node_modules links to. A shared module resolves its packages from this app's node_modules, never the web app's,
 * so nothing that belongs to Svelte can reach the shell. */
const appRoot = __dirname;
const webRoot = path.resolve(appRoot, '..', 'web');

module.exports = mergeConfig(getDefaultConfig(appRoot), {
  watchFolders: [path.join(webRoot, 'src', 'lib'), path.join(webRoot, 'node_modules', '.pnpm')],
  resolver: {
    nodeModulesPaths: [path.join(appRoot, 'node_modules')],
    blockList: [/web\/src\/lib\/.*\.svelte(\.ts)?$/, /web\/src\/lib\/components\/.*/],
  },
});
