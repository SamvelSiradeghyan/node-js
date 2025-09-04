module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/tests/**/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};