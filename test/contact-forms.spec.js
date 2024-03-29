const chai = require('chai');
const { DateTime } = require('luxon');
const chaiExclude = require('chai-exclude');
const path = require('path');
const Harness = require('../src/harness');
const { cloneDeep } = require('lodash');

chai.use(chaiExclude);
const { expect } = chai;


const harness = new Harness({
  directory: path.join(__dirname, 'collateral', 'project-without-source'),
  xformFolderPath: path.join(__dirname, 'collateral', 'forms'),
  harnessDataPath: path.join(__dirname, 'collateral', 'harness.defaults.json'),
  verbose: false,
  reportFormErrors: false,
});

describe('contact forms', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => { return await harness.clear(); });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('district-hospital with new primary contact', async () => {
    const now = DateTime.fromISO('2000-01-01');
    await harness.setNow(now);
    const result = await harness.fillContactCreateForm(
      'district_hospital',
      ['new_person', 'Full', 'Short', '1990-08-06', undefined, '+1-778-227-7744', undefined, 'female', 'patient'],
      ['yes']
    );
    expect(result.errors).to.be.empty;
    expect(result.contacts).excluding(['_id', 'meta']).to.deep.eq([
      {
        contact: {
          _id: result.contacts[1]._id,
        },
        external_id: '',
        geolocation: '',
        is_name_generated: 'true',
        name: "Full's Health Facility",
        notes: '',
        parent: {
          _id: 'family_id',
          parent: {
            _id: 'chw_area_id',
            parent: {
              _id: 'supervisor_area_id',
            },
          },
        },
        reported_date: now.valueOf(),
        type: 'district_hospital',
      },
      {
        date_of_birth: '1990-08-06',
        date_of_birth_method: '',
        ephemeral_dob: {
          dob_approx: '2000-01-01',
          dob_calendar: '1990-08-06',
          dob_iso: '1990-08-06',
          dob_method: '',
          dob_raw: '1990-08-06',
          ephemeral_months: '1',
          ephemeral_years: '2000',
        },
        external_id: '',
        name: 'Full',
        notes: '',
        parent: {
          _id: result.contacts[0]._id,
        },
        phone: '+17782277744',
        phone_alternate: '',
        reported_date: now.valueOf(),
        role: 'patient',
        sex: 'female',
        short_name: 'Short',
        type: 'person',
      },
    ]);
  });

  it('msf-niger investigator', async () => {
    const result = await harness.fillContactCreateForm('investigator', ['Mr. Investigator']);
    expect(result.errors).to.be.empty;

    expect(result.contacts.length).to.eq(2);
    expect(result.contacts[0]).to.deep.include({
      contact: {
        _id: result.contacts[1]._id,
      },
      parent: {
        _id: 'family_id',
        parent: {
          _id: 'chw_area_id',
          parent: {
            _id: 'supervisor_area_id',
          },
        },
      },
      name: 'Mr. Investigator',
      type: 'contact',
      contact_type: 'investigator',
    });

    expect(result.contacts[1]).to.deep.include({
      name: 'Mr. Investigator',
      type: 'contact',
      parent: {
        _id: result.contacts[0]._id,
      },
      contact_type: 'person',
    });

    expect(harness.state.contacts).to.deep.include(result.contacts[0]);
    expect(harness.state.contacts).to.deep.include(result.contacts[1]);
  });

  it('#59 - msf-goma create person', async () => {
    const result = await harness.fillContactCreateForm('goma-person', [
      '', '123', 'Full Name', '1990-10-08', 'male',
      '+1-604-315-4567', 'false', 'eng', 'yes', 'second', 'no', 'unknown',
      ['diabetes'], '', 'notes'
    ]);
    expect(result.errors).to.be.empty;
  });

  it('create and edit household contact', async () => {
    let result = await harness.fillContactCreateForm('household_contact', ['Head', 'female', 'over5', 'no', '20', '', '', 'sister']);
    expect(result.errors).to.be.empty; // create the person
    const contactBeforeEdit = cloneDeep(result.contacts[0]);
    harness.subject = result.contacts[0]; // set the person as subject
    result = await harness.fillContactEditForm('household_contact', []);
    expect(result.errors).to.be.empty;
    expect(harness.subject).excluding(['notes', 'contact_move_note']).to.deep.equal(contactBeforeEdit);
  });

  it('#59 - msf-goma-2 create person', async () => {
    const result = await harness.fillContactCreateForm('goma-person-2', [
      '123', 'Full Name', '1990-10-08', 'male',
      'yes', 'second', 'no',
      'unknown',
      ['diabetes']
    ]);

    expect(result.errors).to.be.empty;
  });

  it('form without pages', async () => {
    const now = DateTime.fromISO('2000-01-01');
    await harness.setNow(now);
    const result = await harness.fillContactCreateForm('no_pages', [
      'chw', '123', 'full name', '1990-10-08', undefined, 'male', '778-318-4567', 'no', 'english',
      'yes', 'second', 'no', 'unknown', ['diabetes'], 'true', 'notes'
    ]);
    expect(result.errors).to.be.empty;

    expect(result.contacts[0]).to.deep.include({
      type: 'contact',
      role: 'chw',
      arv_number: '123',
      name: 'full name',
      date_of_birth: '1990-10-08',
      date_of_birth_method: '',
      ephemeral_dob: {
        dob_calendar: '1990-10-08',
        dob_method: '',
        ephemeral_months: '1',
        ephemeral_years: '2000',
        dob_approx: '2000-01-01',
        dob_raw: '1990-10-08',
        dob_iso: '1990-10-08'
      },
      sex: 'male',
      phone: '+17783184567',
      shared_phone: '',
      preferred_language: '',
      arv: { arv_status: 'yes', arv_line: 'second', stable: 'no' },
      tb: { tb_status: 'unknown' },
      chronic_disease: 'diabetes',
      opt_out: 'yes',
      notes: 'notes',
      contact_type: 'no_pages',
      reported_date: now.valueOf()
    });
  });

  it('#239 - fillContactCreateForm yields error undefined (reading map)', async () => {
    await harness.setNow('2000-01-01');
    const result = await harness.fillContactCreateForm(
      'clinic',
      ['no'],
      ['no', 'Joe', '', 'male', 40, '', '', '2000-01-01', 'national', 'CN123456789076', 'no', 'no', 'negative', 'no', 'no', 'no', 'no', 'no', 'yes', 'yes'],
      ['no'], 
      ['yes', 'yes', 'yes', 'yes', 'yes', 'yes', 'yes', 'yes', 'flush', 'mud', 'yes_connected_to_sewer', 'yes', 'water_soap_available', 'yes']
    );
    expect(result.errors).to.be.empty;
  });

  it('#247 - forms using Android App Launcher cannot be filled', async () => {
    await harness.setNow('2000-01-01');
    const allDrugs = ['AZT300_3TC150','EFV600','TDF300_3TC300_EFV600','TDF300_3TC300','ATV_R300_100','ABC600_3TC300','LPV_R200_50','TDF300_3TC300_DTG50','DTG50'];
    const result = await harness.fillContactCreateForm('patient', ['Patient', 'McPatient', '1990-02-01', 'P123', 'ARV-1', 'Male', 'FN', 'test-dp','custom',allDrugs]);
    expect(result.errors).to.be.empty;
  });
});
