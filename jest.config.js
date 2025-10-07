/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(baileys|@adiwajshing/keyed-db|pino|pino-pretty|audio-decode|audio-type|audio-buffer|mpg123-decoder|@wasm-audio-decoders)/)',
  ],
}
