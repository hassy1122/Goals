'use strict';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  setupFiles: ['<rootDir>/src/tests/setup.js'],
  clearMocks: true,
  testTimeout: 30000,
};
