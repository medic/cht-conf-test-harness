const { expect } = require('chai');
const path = require('path');

const Harness = require('../src/harness');

describe('test cht.v1 in contact summary ', () => {

  const harness = new Harness({
    directory: path.join(__dirname, 'collateral', 'project-with-source'),
    harnessDataPath: path.join(__dirname, 'collateral', 'harness.defaults.json'),
    verbose: true,
  });

  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => { return await harness.clear(); });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('cht API in contact summary - user has permissions', async () => {   
    const contactSummary = await harness.getContactSummary();
    expect(contactSummary).to.not.be.empty;
    expect(contactSummary.context).to.not.be.undefined;
    expect(contactSummary.context.hasPermissions).to.be.true;
    expect(contactSummary.context.hasAnyPermission).to.be.true;
  });

  it('cht API in contact summary - user has no permissions ', async () => {
    harness.userRoles = ['other'];
    const contactSummary = await harness.getContactSummary();
    expect(contactSummary).to.not.be.empty;
    expect(contactSummary.context).to.not.be.undefined;
    expect(contactSummary.context.hasPermissions).to.be.false;
    expect(contactSummary.context.hasAnyPermission).to.be.false;
  });

});
