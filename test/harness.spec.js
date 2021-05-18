const path = require('path');
const { expect } = require('chai');
const Harness = require('../src/harness');

const formName = 'pnc_followup';
const harness = new Harness({
  directory: path.join(__dirname, 'collateral'),
  xformFolderPath: path.join(__dirname, 'collateral', 'forms'),
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

    it('getNow defaults to now when undefined', async () => {
      const now = await harness.getNow();
      expect(now).to.be.lte(Date.now());
    });

    it('flush some', async () => {
      await harness.setNow('1985-08-06');
      await harness.flush({ years: 1, days: 1, hours: 2 });
      const now = await harness.getNow();
      // TODO: This is timezone sensitive...
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

    it('contact summary is cleared', () => {
      // defaults to calculated value
      expect(harness.contactSummary.fields.length).to.be.gt(1);
      harness.contactSummary = { fields: [], cards: [] };
      expect(harness.contactSummary.fields.length).to.eq(0);

      harness.clear();
      expect(harness.contactSummary.fields.length).to.be.gt(1);
    });

    it('contact summary can be unassigned', () => {
      harness.contactSummary = { fields: [], cards: [] };
      expect(harness.contactSummary.fields.length).to.eq(0);

      harness.contactSummary = undefined;
      expect(harness.contactSummary.fields.length).to.be.gt(1);
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

});
