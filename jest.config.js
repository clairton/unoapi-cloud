module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(ts|tsx|json|js)$': ['ts-jest', {
      useESM: true,
    }]
  },
  // moduleNameMapper: {
  //   '^(.*)\\.json$': '$1.json'
  // },
  // testPathIgnorePatterns: ['/node_modules/'],
  // moduleDirectories: ['node_modules'],
  // transformIgnorePatterns: ['node_modules/(?!ci-info/)']
  transformIgnorePatterns: ['node_modules\\/(?!ci-info\\/)']
};