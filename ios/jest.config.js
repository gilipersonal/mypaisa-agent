module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: { '^#lib/(.*)$': '<rootDir>/../web/src/lib/$1' },
  transformIgnorePatterns: ['node_modules/(?!(.pnpm|react-native|@react-native|react-native-.*|@tanstack)/)'],
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  modulePathIgnorePatterns: ['<rootDir>/build/'],
};
