const { expect } = require('chai');
const path = require('path');
const rewire = require('rewire');
const sinon = require('sinon');

const Harness = rewire('../src/harness');

const harness = new Harness({
  directory: path.join(__dirname, 'collateral', 'project-without-source'),
  xformFolderPath: path.join(__dirname, 'collateral', 'forms'),
  harnessDataPath: path.join(__dirname, 'collateral', 'harness.defaults.json'),
  verbose: false,
  reportFormErrors: false,
});


describe('getContactSummary', () => {
  let functionStub;
  let basicReport;

  before(async () => {
    await harness.start();
    await harness.setNow('2000-01-01');
    basicReport = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
    expect(basicReport.errors).to.be.empty;
  });
  after(async () => { return await harness.stop(); });

  beforeEach(async () => {
    await harness.clear();
    harness.pushMockedDoc(basicReport.report);
    functionStub = sinon.stub();
  });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('passthrough if all args given', async () => Harness.__with__({ Function: function () { return functionStub; } })(async () => {
    const contact = {};
    const reports = [];
    const lineage = [];
    await harness.getContactSummary(contact, reports, lineage);
    expect(functionStub.args[0]).to.deep.include.members([contact, reports, lineage]);
    expect(functionStub.args[0][3].v1).to.not.be.undefined;
  }));

  it('mocks datetime - setNow after start', async () => {
    const expectedTime = 1000;
    await harness.setNow(expectedTime);
    expect(new Date().getTime()).to.eq(expectedTime);
  });

  it('state used when no args given', async () => Harness.__with__({ Function: function () { return functionStub; } })(async () => {
    await harness.getContactSummary();

    const args = functionStub.args[0];
    expect(args.length).to.eq(4);
    expect(args[0]).to.nested.include({
      _id: 'patient_id',
      name: 'Patient Name',
      'parent._id': 'family_id',
      'parent.foo': 'bar', // hydrated
      'parent.parent._id': 'chw_area_id',
    });
    expect(args[1]).to.deep.eq(harness.state.reports);
    expect(args[2][0]).to.deep.contain({
      _id: 'family_id',
      foo: 'bar',
    });
    expect(args[2][1]).to.deep.contain({
      _id: 'chw_area_id',
    });
    expect(args[2][2]).to.be.undefined;
  }));

  it('state used for reports and lineage but not contact', async () => Harness.__with__({ Function: function () { return functionStub; } })(async () => {
    const mockContact = { _id: 'foo' };
    await harness.getContactSummary(mockContact);
    expect(functionStub.args[0]).to.deep.include.members([mockContact, [], []]);
    expect(functionStub.args[0][3].v1).to.not.be.undefined;
  }));

  it('#71 - mocked reports in state are passed to contact-summary', async () => Harness.__with__({ Function: function () { return functionStub; } })(async () => {
    const mockContact = { _id: 'foo', type: 'person' };
    const mockReport = { _id: 'bar', patient_id: mockContact._id };
    harness.pushMockedDoc(mockReport);
    await harness.getContactSummary(mockContact);
    expect(functionStub.args[0]).to.deep.include.members([mockContact, [mockReport], []]);
    expect(functionStub.args[0][3].v1).to.not.be.undefined;
  }));

  it('contact summary for patient_id', async () => {
    const contactSummary = await harness.getContactSummary('patient_id');

    expect(contactSummary.cards).to.deep.eq([]);
    expect(contactSummary.context).to.deep.eq({ muted: false, hh_contact: 'CHP Area 001 Contact' });
    expect(contactSummary.fields).to.deep.include({ label: 'contact.age', value: '1970-07-09', filter: 'age', width: 3 });
    expect(contactSummary.fields).to.deep.include({ label: 'contact.sex', value: 'female', translate: true, width: 3 });
  });

  it('throws on invalid id', async () => {
    try {
      await harness.getContactSummary('dne');
      assert.fail('expect throw');
    }
    catch (err) {
      expect(err.message).to.include('failed for id');
    }
  });

  it('throw for empty user', async () => {
    harness.user = {};
    try {
      await harness.getContactSummary();
      expect.fail('expect throw');
    }
    catch (error) {
      expect(error.message).to.contain('_id');
    }
  });
});

describe('cht.v1 in contact summary ', () => {

  const harness = new Harness({
    directory: path.join(__dirname, 'collateral', 'project-with-source'),
    harnessDataPath: path.join(__dirname, 'collateral', 'harness.defaults.json'),
    verbose: true,
  });

  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => { return await harness.clear(); });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('#214 - cht API in contact summary - user has permissions', async () => {   
    const contactSummary = await harness.getContactSummary();
    expect(contactSummary).to.not.be.empty;
    expect(contactSummary.context).to.not.be.undefined;
    expect(contactSummary.context.hasPermissions).to.be.true;
    expect(contactSummary.context.hasAnyPermission).to.be.true;
  });

  it('#214 - cht API in contact summary - user has no permissions ', async () => {
    harness.userRoles = ['other'];
    const contactSummary = await harness.getContactSummary();
    expect(contactSummary).to.not.be.empty;
    expect(contactSummary.context).to.not.be.undefined;
    expect(contactSummary.context.hasPermissions).to.be.false;
    expect(contactSummary.context.hasAnyPermission).to.be.false;
  });

});

