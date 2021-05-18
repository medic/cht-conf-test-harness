const { expect } = require('chai');
const path = require('path');
const rewire = require('rewire');
const sinon = require('sinon');

const Harness = rewire('../src/harness');

const harness = new Harness({
  directory: path.join(__dirname, 'collateral'),
  xformFolderPath: path.join(__dirname, 'collateral', 'forms'),
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
    basicReport.patient_id = harness.content.contact._id;
    harness.pushMockedDoc(basicReport);
    functionStub = sinon.stub();
  });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('passthrough if all args given', async () => Harness.__with__({ Function: function() { return functionStub; } })(() => {
    const contact = {};
    const reports = [];
    const lineage = [];
    harness.getContactSummary(contact, reports, lineage);
    expect(functionStub.args[0]).to.deep.eq([contact, reports, lineage]);
  }));

  it('mocks datetime - setNow after start', async () => {
    const expectedTime = 1000;
    await harness.setNow(expectedTime);
    expect(new Date().getTime()).to.eq(expectedTime);
  });

  it('state used when no args given', async () => Harness.__with__({ Function: function() { return functionStub; } })(() => {
    harness.getContactSummary();
    const [parentOfDefault] = harness.state.contacts;
    expect(functionStub.args[0]).to.deep.eq([harness.content.contact, harness.state.reports, [parentOfDefault]]);
  }));

  it('state used for reports and lineage but not contact', async () => Harness.__with__({ Function: function() { return functionStub; } })(() => {
    const mockContact = { _id: 'foo' };
    harness.getContactSummary(mockContact);
    expect(functionStub.args[0]).to.deep.eq([mockContact, [], []]);
  }));

  it('#71 - mocked reports in state are passed to contact-summary', async () => Harness.__with__({ Function: function() { return functionStub; } })(() => {
    const mockContact = { _id: 'foo', type: 'person' };
    const mockReport = { _id: 'bar', patient_id: mockContact._id };

    harness.pushMockedDoc(mockReport);
    harness.getContactSummary(mockContact);
    expect(functionStub.args[0]).to.deep.eq([mockContact, [mockReport], []]);
  }));

  it('contact summary for patient_id_data', async () => {
    const contactSummary = harness.getContactSummary('patient_id_data');

    expect(contactSummary.cards).to.deep.eq([]);
    expect(contactSummary.context).to.deep.eq({ muted: false, hh_contact: 'CHP Area 001 Contact' });
    expect(contactSummary.fields).to.deep.include({ label: 'contact.age', value: '1970-07-09', filter: 'age', width: 3 });
    expect(contactSummary.fields).to.deep.include({ label: 'Phone Number', value: '', filter: 'phone', width: 3 });
    expect(contactSummary.fields).to.deep.include({ label: 'contact.sex', value: 'female', translate: true, width: 3 });
    expect(contactSummary.fields).to.deep.include({ label: 'contact.external_id', value: '', width: 3 });
  });

  it('throws on invalid id', () => expect(() => harness.getContactSummary('dne')).to.throw('Cannot get summary'));
});
