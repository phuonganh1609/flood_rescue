export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/modules/{inventory,warehouse,vehicles,resources}/**/*.js',
    '!src/modules/**/**.model.js',
    '!src/modules/**/**.routes.js',
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000,
  verbose: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
