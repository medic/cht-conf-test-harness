const { expect } = require('chai');
const path = require('path');
const Harness = require('../src/harness');

const harness = new Harness({
  directory: path.join(__dirname, 'collateral', 'project-without-source'),
  xformFolderPath: path.join(__dirname, 'collateral', 'forms'),
  harnessDataPath: path.join(__dirname, 'collateral', 'harness.defaults.json'),
  verbose: true,
  reportFormErrors: false,
  headless: false,
});

describe('widget tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => { return await harness.clear(); });
  // afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  describe('tel', () => {
    // not seeing any error at all showing
    it('invalid telephone number shows error', async () => {
      const singleTel = await harness.fillForm('tel', [1, '9873', '']);
      expect(singleTel.errors.length).to.eq(2); // 1 general + 1 specific
    });
  });
});
