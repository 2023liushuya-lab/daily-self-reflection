const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Allow imports from shared directory outside expo-app
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '../shared'),
];

// Allow resolving modules from project root
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
  ],
  extraNodeModules: {
    '@shared': path.resolve(__dirname, '../shared'),
  },
};

// Don't block shared directory
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return middleware;
  },
};

module.exports = config;
