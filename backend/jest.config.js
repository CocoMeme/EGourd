module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
};
