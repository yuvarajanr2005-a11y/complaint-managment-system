const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('API Smoke Test', () => {
  it('loads environment and app configuration cleanly', () => {
    const app = require('../src/app');
    assert.ok(app, 'Express app should be successfully exported');
  });
});
