const { expect } = require('chai');
const { DateTime } = require('luxon');
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
    it('tel widget error', async () => {
      const now = DateTime.fromISO('2000-01-01');
      await harness.setNow(now);
      const result = await harness.fillContactForm('no_pages', [
        'chw', '123', 'full name', '1990-10-08', undefined, 'male', '555-123-4567', 'no', 'english',
        'yes', 'second', 'no', 'unknown', ['diabetes'], 'true', 'notes'
      ]);
      expect(result.errors.length).to.eq(2);
      expect(result.errors[1].msg).to.include('valid local number');
    });
  });
});
