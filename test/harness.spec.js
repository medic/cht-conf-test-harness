const rewire = require('rewire');
const path = require('path');
const sinon = require('sinon');
const { expect } = require('chai');
const Harness = rewire('../src/harness');

const formName = 'pnc_followup';
const harness = new Harness({
  directory: path.join(__dirname, 'collateral'),
  xformFolderPath: path.join(__dirname, 'collateral'),
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
  });

  describe('fillForm', () => {
    it('returns list of validation errors', async () => {
      const result = await harness.fillForm(formName, ['yes']);
      expect(result).to.nested.include({
        'errors[0].msg': 'This field is required',
        'errors[0].type': 'validation',
        'errors[0].question': "When PNC visit was planned?*\nThis field is required",

        'errors[1].msg': 'This field is required',
      });
      expect(result.report).to.eq(undefined);
    });

    it('a different list of validation errors', async () => {
      const result = await harness.fillForm(formName, ['yes', '2100-01-01', '2100-01-01']);
      expect(result).to.nested.include({
        'errors[0].msg': 'Value not allowed',
        'errors[0].type': 'validation',
        'errors[0].question': "When PNC visit was planned?*\nValue not allowed",

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
        patient_id: 'patient_id_data',
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

  describe('getTasks', () => {
    beforeEach(async () => await harness.setNow('2000-01-01'));

    it('followup task present one day before schedule', async () => {
      const formResult = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
      expect(formResult.errors).to.be.empty;
  
      const tasks = await harness.getTasks({ now: '2000-01-07' });
      expect(tasks).to.have.property('length', 1);
      expect(tasks[0]).to.nested.include({
        'contact._id': 'patient_id_data',
        resolved: false,
        icon: 'newborn',
        'actions[0].form': 'pnc_followup',
      });
    });
  
    it('followup task present three days after schedule', async () => {
      const formResult = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
      expect(formResult.errors).to.be.empty;
  
      const tasks = await harness.getTasks({ now: '2000-01-10' });
      expect(tasks).to.have.property('length', 1);
      expect(tasks[0]).to.nested.include({ resolved: false });
    });  
  
    it('followup task not present at time of scheduling', async () => {
      const formResult = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
      expect(formResult.errors).to.be.empty;
      expect(await harness.getTasks()).to.be.empty;
    });
  });
  
  describe('loadAction', () => {
    beforeEach(async () => await harness.setNow('2000-01-01'));
    it('tasks action resolves task', async () => {
      const scheduledDate = '2000-01-07';
      const initialResult = await harness.fillForm('pnc_followup', ['no'], ['yes', scheduledDate]);
      expect(initialResult.errors).to.be.empty;
  
      await harness.setNow(scheduledDate);
      const tasks = await harness.getTasks();
      expect(tasks).to.have.property('length', 1);
      
      await harness.loadAction(tasks[0].actions[0]);
      const followupResult = await harness.fillForm(['no_come_back']);
      expect(followupResult.errors).to.be.empty;

      // This data is the result of a build-time shim forced into enketo
      expect(followupResult.report).to.nested.include({
        'fields.inputs.source': 'task',
        'fields.inputs.source_id': '1',
      });
  
      const actual = await harness.getTasks();
      expect(actual).to.be.empty;
    });
  });

  describe('getContactSummary', () => {
    let functionStub, basicReport;

    before(async () => {
      await harness.setNow('2000-01-01');
      basicReport = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
      expect(basicReport.errors).to.be.empty;
    });
    beforeEach(() => {
      harness.pushMockedReport(basicReport);
      functionStub = sinon.stub();
    });

    it('passthrough if all args given', async () => Harness.__with__({ Function: function() { return functionStub; } })(() => {
      const contact = {}, reports = [], lineage = [];
      harness.getContactSummary(contact, reports, lineage);
      expect(functionStub.args[0]).to.deep.eq([contact, reports, lineage]);
    }));

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

  it('control now', async () => {
    const expectedDate = '01/01/1990';
    harness.setNow(expectedDate);
    const result = await harness.fillForm(formName, ['no_come_back']);
    expect(result.report.reported_date).to.eq(new Date(expectedDate).getTime());
    expect(result.report.fields).to.include({
      patient_age_in_years: '19',
    });
  });

  describe('special forms', () => {
    it('patient_assessment with user-based fields', async () => {
      const mrdtUser = Object.assign({}, harness.defaultUser, { is_in_mrdt: true });
      const result = await harness.fillForm({ form: 'patient_assessment_over_5', user: mrdtUser },
        ['home_visit'],
        ['c_assessment_time_2', 'c_when_illness_2'],
        ['yes', ...Array(8).fill('no'), 'unavailable', 'watching'],
        [37],
        ['yes']);
      expect(result.errors).to.be.empty;
      expect(result.report.fields.inputs.user.is_in_mrdt).to.eq('true');
    });

    const repeatingAnswers = [
      ['method_lmp'],
      ['1999-08-01'], [], ['4'],
      ['no', 'no', 'no', 'no'], // this is the page with the repeating multi-select
      ['no'], [], ['no', 'no'], ['none', 'no'], Array(11).fill('no'), ['no'],
      ['no'], [], ['no'], ['no'], []
    ];

    it('repeating prompt all nos', async () => {
      await harness.setNow('1999-10-10');
      const result = await harness.fillForm('pregnancy', ...repeatingAnswers); 
      expect(result.errors).to.be.empty;
    });

    it('repeating prompt with answers', async () => {
      await harness.setNow('1999-10-10');
      const withAnswers = Object.assign(repeatingAnswers, { 4: ['yes', '2020-09-01', 'no', 'no', 'no'] });
      const result = await harness.fillForm('pregnancy', ...withAnswers); 
      expect(result.errors[0].msg).to.include('Date must be within this pregnancy and cannot be in the future.');
    });

    it('form with many nested .or repeating prompts', async () => {
      const oneChildHealth = [
        ['alive_well'],
        Array(5).fill('no'),
        ['1', '1', '1999-09-15', 'health_facility', 'vaginal', 'skilled'],
        ['alive_well', 'Baby-1', 'female', 'yes', '2500', 'yes', '45', 'bcg_and_birth_polio', 'yes', 'yes'].concat(Array(9).fill('no')),
        [],
        ['within_24_hrs'],
        []
      ];

      await harness.setNow('1999-10-10');
      const result = await harness.fillForm('subfolder/delivery', ...oneChildHealth);
      expect(result.errors).to.be.empty;
      expect(result.report.form).to.eq('delivery');
    });

    it('standard "on" form - contains textarea note', async () => {
      const result = await harness.fillForm('on', ['yes', 'this is a note']);
      expect(result.errors).to.be.empty;
    });

    it('cht-reference "delivery" form - repeat areas', async () => {
      await harness.setNow('2000-04-30');
      const oneChildHealthyOneDeceasedOneStillbirth = [
        ['alive_well'],
        Array(5).fill('no'),
        ['3', '1', '2000-04-22', 'health_facility', 'vaginal'],
        ['2000-04-22', 'health_facility', 'yes', '', '2000-04-23', 'home', 'no', ''],
        ['alive_well', 'Baby-1', 'female', 'yes', '2500', 'yes', '45', 'bcg_and_birth_polio', 'yes', 'yes'].concat(Array(9).fill('no')),
        [],
        ['within_24_hrs'],
        []
      ];
      const result = await harness.fillForm('delivery', ...oneChildHealthyOneDeceasedOneStillbirth);
      expect(result.errors).to.be.empty;
      expect(result.report.fields.babys_condition.baby_repeat).to.have.property('length', 1);
      expect(result.report.fields.baby_death.baby_death_repeat).to.have.property('length', 2);
    });
  });
});
