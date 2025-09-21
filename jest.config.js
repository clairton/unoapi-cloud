/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@whiskeysockets/baileys$': '<rootDir>/test-setup/baileys.mock.ts',
    '^@whiskeysockets/baileys/lib/Utils/logger$': '<rootDir>/test-setup/baileys-logger.mock.ts',
  },
};
