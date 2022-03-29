const path = require('path');
const { expect } = require('chai');
const { DateTime, Duration } = require('luxon');
const Harness = require('../src/harness');

const formName = 'pnc_followup';
const harness = new Harness({
  directory: path.join(__dirname, 'collateral', 'project-without-source'),
  xformFolderPath: path.join(__dirname, 'collateral', 'forms'),
  harnessDataPath: path.join(__dirname, 'collateral', 'harness.defaults.json'),
  verbose: false,
  reportFormErrors: false,
});

describe('Harness tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => { return await harness.clear(); });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('pnc_followup form is rendered', async () => {
    await harness.loadForm(formName);
    expect(harness.state.pageContent).to.include('id="pnc_followup"');
  });

  describe('time management', () => {
    it('set and retrieve now', async () => {
      const expected = '1990-02-01';
      await harness.setNow(expected);
      const actual = await harness.getNow();
      expect(new Date(actual).toString()).to.include('Feb 01 1990');
    });

    const timezones = ['America/Vancouver', 'Africa/Nairobi'];
    for (const timezone of timezones) {
      it(`#160 - ${timezone} do not default to ISO for RFC2822 date string formats`, async () => {
        const existingTimezone = process.env.TZ;
        process.env.TZ = timezone;
        try {
          await harness.setNow('1990-02-01');
          const isoDateFormat = await harness.getNow();
          expect(new Date(isoDateFormat).toLocaleString()).to.include('2/1/1990');
        } finally {
          process.env.TZ = existingTimezone;
        }
      });
    }

    it('getNow defaults to now when undefined', async () => {
      const now = await harness.getNow();
      expect(now).to.be.lte(Date.now());
    });

    it('flush some', async () => {
      await harness.setNow('1985-08-06');
      await harness.flush({ years: 1, days: 1, hours: 2 });
      const now = await harness.getNow();
      expect(new Date(now).toString()).to.include('Thu Aug 07 1986 02:00:00');
    });

    it('flush shorthands as days', async () => {
      await harness.setNow('1985-08-06');
      await harness.flush(5);
      const now = await harness.getNow();
      expect(new Date(now).toString()).to.include('Sun Aug 11 1985 00:00:00');
    });

    it('control now', async () => {
      const expectedDate = '01/01/1990';
      harness.setNow(expectedDate);
      const result = await harness.fillForm(formName, ['no_come_back']);
      expect(result.report.reported_date).to.eq(new Date(expectedDate).getTime());
      expect(result.report.fields).to.include({
        patient_age_in_years: '19',
      });
    });

    it('setNow works with Luxon DateTime', async () => {
      const t = DateTime.now();
      await harness.setNow(t);
      expect(harness.getNow()).to.equal(t.toMillis());
    });

    it('setNow throws for invalid date formats', async () => {
      try {
        await harness.setNow();
        expect.fail('Should throw');
      } catch (err) {
        expect(err.message).to.include('undefined date');
      }
    });

    it('flush throws for invalid duration', async () => {
      await harness.setNow('2000-01-01');
      try {
        await harness.flush();
        expect.fail('Should throw');
      } catch (err) {
        expect(err.message).to.include('Unsupported duration value');
      }
    });

    it('flush works with Luxon Duration', async () => {
      await harness.setNow('2000-01-01');
      const d = Duration.fromISO('P5Y3M'); // 5 years, 3 months
      await harness.flush(d);
      const now = await harness.getNow();
      expect(new Date(now).toString()).to.include('Fri Apr 01 2005 00:00:00');
    });

    it('#20 - flush accounts for DST', async () => {
      const t = DateTime.fromISO('2019-11-03', { zone: 'Canada/Pacific' });
      await harness.setNow(t);
      await harness.flush(1);
      const now = await harness.getNow();
      const parsed = DateTime.fromMillis(now, { zone: 'Canada/Pacific' });
      expect(parsed.toISO()).to.include('2019-11-03T23:00:00');
    });

    it('setNow works with a variety of date formats', async () => {
      let now;

      await harness.setNow('2000-01-01');
      now = await harness.getNow();
      expect(new Date(now).toString()).to.include('Sat Jan 01 2000');

      await harness.setNow('December 17, 2005');
      now = await harness.getNow();
      expect(new Date(now).toString()).to.include('Sat Dec 17 2005');

      await harness.setNow('2010 Feb 28');
      now = await harness.getNow();
      expect(new Date(now).toString()).to.include('Sun Feb 28 2010');

      await harness.setNow('05/20/2010');
      now = await harness.getNow();
      expect(new Date(now).toString()).to.include('Thu May 20 2010');

      await harness.setNow({ year: 2010, month: 6, day: 1});
      now = await harness.getNow();
      expect(new Date(now).toString()).to.include('Tue Jun 01 2010');
    });
  });

  describe('fillForm', () => {
    it('returns list of validation errors', async () => {
      const result = await harness.fillForm(formName, ['yes']);
      expect(result).to.nested.include({
        'errors[0].msg': 'This field is required',
        'errors[0].type': 'validation',
        'errors[0].question': 'When PNC visit was planned?*\nThis field is required',

        'errors[1].msg': 'This field is required',
      });
      expect(result.report).to.eq(undefined);
    });

    it('throw on absent form', async () => {
      try {
        await harness.fillForm('dne', ['yes']);
        expect.fail('Should throw');
      } catch (err) {
        expect(err.message).to.include('not available');
      }
    });

    it('throw for empty user', async () => {
      try {
        harness.user = {};
        await harness.fillForm('dne', ['yes']);
        expect.fail('Should throw');
      } catch (err) {
        expect(err.message).to.include('_id');
      }
    });

    it('a different list of validation errors', async () => {
      const result = await harness.fillForm(formName, ['yes', '2100-01-01', '2100-01-01']);
      expect(result).to.nested.include({
        'errors[0].msg': 'Value not allowed',
        'errors[0].type': 'validation',
        'errors[0].question': 'When PNC visit was planned?*\nValue not allowed',

        'errors[1].msg': 'Value not allowed',
      });
      expect(result.report).to.eq(undefined);
    });

    it('one page completes but form is incomplete', async () => {
      const result = await harness.fillForm(formName, ['no']);
      expect(result).to.nested.include({
        'errors[0].msg': 'Form is incomplete',
        'errors[0].type': 'general',

        'errors[1].msg': 'This field is required',
        'errors[1].type': 'validation',
      });
      expect(result.report).to.eq(undefined);
      expect(result.additionalDocs).to.deep.eq([]);
    });

    it('too many inputs for a page', async () => {
      const answers = ['yes', '2019-02-20', '2019-02-21', 'no_time', 'extra'];
      const result = await harness.fillForm(formName, answers);
      expect(result).to.nested.include({
        'errors[0].msg': 'Attempted to fill 5 questions, but only 4 are visible.',
        'errors[0].type': 'page',
        'errors[0].section': 'answer-4',
      });
      expect(result.errors[0].answers).to.deep.eq(answers);
      expect(result).to.not.haveOwnProperty('report');
    });

    it('successfully fill with only nos', async () => {
      const result = await harness.fillForm(formName, ['no'], ['no']);
      expect(result.errors).to.be.empty;
      expect(result.report).to.deep.include({
        form: formName,
        type: 'data_record',
        content_type: 'xml',
      });

      expect(result.report.fields).to.deep.include({
        patient_name: 'Patient Name',
        patient_sex: 'female',
        patient_id: 'patient_id',
        s_pnc_visits: {
          s_pnc_visit: 'no',
          s_pnc_planned_date_show: '',
          s_pnc_date_show: '',
        },
        next_pnc: {
          s_next_pnc: 'no',
          next_pnc_date: '',
        },
        summary:
        {
          s_sum_submission: '',
          r_summary: '',
          r_patient_info: '',
          generated_note_name_42: '',
          pnc_not_done: '',
          pnc_not_scheduled: '',
          next_pnc_not_scheduled: ''
        },
      });
    });

    it('#128 - can set falsey value as answer', async () => {
      await harness.setNow('1999-10-10');
      const babiesAlive = 0;
      const answers = [
        ['alive_well'],
        Array(5).fill('no'),
        [1, babiesAlive, '1999-09-15', 'health_facility', 'vaginal', 'skilled'],
        ['1999-09-15', 'health_facility', 'yes'],
        ['none']
      ];

      const result = await harness.fillForm('subfolder/delivery', ...answers);

      expect(result.report.fields.delivery_outcome.babies_alive).to.eq(babiesAlive.toString());
    });

    describe('multi-select', () => {
      it('using a list of booleans', async () => {
        const result = await harness.fillForm('select_multiple', ['true', 'false,true,true,false,false']);
        expect(result.errors).to.be.empty;

        expect(result.report).to.nested.deep.include({
          'fields.test_1': {
            risks_past: 'heart_condition',
            risks_new: 'asthma high_blood_pressure',
          },
        });
        expect(result.additionalDocs).to.deep.eq([]);
      });

      it('using a list of values', async () => {
        const result = await harness.fillForm('select_multiple', ['none', 'asthma,high_blood_pressure']);
        expect(result.errors).to.be.empty;

        expect(result.report).to.nested.deep.include({
          'fields.test_1': {
            risks_past: 'none',
            risks_new: 'asthma high_blood_pressure',
          },
        });
      });

      it('using an array of booleans', async () => {
        const result = await harness.fillForm('select_multiple', [[true], [false,true,true,false,false]]);
        expect(result.errors).to.be.empty;

        expect(result.report).to.nested.deep.include({
          'fields.test_1': {
            risks_past: 'heart_condition',
            risks_new: 'asthma high_blood_pressure',
          },
        });
      });

      it('using an array of values', async () => {
        const result = await harness.fillForm('select_multiple', [['none'], ['asthma', 'high_blood_pressure']]);
        expect(result.errors).to.be.empty;

        expect(result.report).to.nested.deep.include({
          'fields.test_1': {
            risks_past: 'none',
            risks_new: 'asthma high_blood_pressure',
          },
        });
      });
    });
  });

  describe('clear', () => {
    it('content attribute is reset', () => {
      const originalDoB = harness.subject.date_of_birth;
      harness.content.foo = 'bar';
      expect(originalDoB).to.be.not.undefined;
      expect(harness.content.foo).to.eq('bar');
      
      harness.subject.date_of_birth = 'not_original';
      harness.clear();

      expect(harness.subject.date_of_birth).to.eq(originalDoB);
      expect(harness.content.foo).to.be.undefined;
    });

    it('clears mocked datetime', async () => {
      const expectedTime = 1000;
      await harness.setNow(expectedTime);
      expect(new Date().getTime()).to.eq(expectedTime);

      await harness.clear();
      expect(new Date().getTime()).to.not.eq(expectedTime);
    });

    it('user is reset', () => {
      harness.user.foo = 'bar';
      expect(harness.user.name).to.eq('CHW');
      expect(harness.user.foo).to.eq('bar');
      
      harness.subject.date_of_birth = 'not_original';
      harness.clear();

      expect(harness.user.name).to.eq('CHW');
      expect(harness.user.foo).to.be.undefined;
    });
  });

  describe('pushMockDoc', () => {
    it('district_hospital contact type', () => {
      const mockContact = { type: 'district_hospital', reported_date: 123, fields: { foo: 'bar' } };
      harness.pushMockedDoc(mockContact);
      expect(harness.state.contacts).to.deep.include(mockContact);
    });

    it('person contact type', () => {
      const mockContact = { type: 'person', reported_date: 123, fields: { foo: 'bar' } };
      harness.pushMockedDoc(mockContact);
      expect(harness.state.contacts).to.deep.include(mockContact);
    });

    it('flexible contact_type', () => {
      const mockContact = { type: 'contact', contact_type: 'custom', reported_date: 123, fields: { foo: 'bar' } };
      harness.pushMockedDoc(mockContact);
      expect(harness.state.contacts).to.deep.include(mockContact);
    });

    it('can also accept an array (#35)', () => {
      const mockContact = { type: 'contact', contact_type: 'custom', reported_date: 123, fields: { foo: 'bar' } };
      harness.pushMockedDoc([mockContact, mockContact]);
      expect(harness.state.contacts).to.deep.include(mockContact);
    });
  });

  describe('userSettingsDoc', () => {
    it('default value', () => expect(harness.userSettingsDoc).to.deep.eq({
      _id: 'org.couchdb.user:chw_area_contact_id',
      contact_id: 'chw_area_contact_id',
      facility_id: 'chw_area_id',
      name: 'chw_area_contact_id',
      type: 'user-settings',
    }));

    it('can be overwritten, then cleared', async () => {
      const userSettingsDoc = { foo: 'bar' };
      harness.userSettingsDoc = userSettingsDoc;
      expect(harness.userSettingsDoc).to.deep.eq(userSettingsDoc);

      await harness.clear();
      expect(harness.userSettingsDoc).to.not.include(userSettingsDoc);
    });

    it('empty user', async () => {
      harness.user = {};
      expect(harness.userSettingsDoc).to.include({
        _id: `org.couchdb.user:undefined`,
        type: 'user-settings',
      });
    });

    it('undefined user', async () => {
      harness.user = undefined;
      expect(harness.userSettingsDoc).to.be.undefined;
    });
  });

});
