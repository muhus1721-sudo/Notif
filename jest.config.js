/**
 * Runs every suite twice — once with React Native's iOS module resolution and
 * once with Android's — so platform-specific branches are both covered.
 */
const projects = ['ios', 'android'].map((platform) => {
  // watchPlugins is only valid at the root, so keep it out of the project config.
  const { watchPlugins, ...preset } = require(`jest-expo/${platform}/jest-preset`);
  return {
    ...preset,
    displayName: platform,
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    // civilaid/ is a separate app with its own tests.
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/civilaid/'],
  };
});

module.exports = { projects };
