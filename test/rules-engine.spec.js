const path = require('path');
const semver = require('semver');
const { expect } = require('chai');
const Harness = require('../src/harness');

const { availableCoreVersions } = require('../src/cht-core-factory');

for (const coreVersion of availableCoreVersions) {
  describe(`tests for RulesEngine v${coreVersion} (project-without-source)`, () => {
    const harness = new Harness({
      directory: path.join(__dirname, 'collateral', 'project-without-source'),
      xformFolderPath: path.join(__dirname, 'collateral', 'forms'),
      harnessDataPath: path.join(__dirname, 'collateral', 'harness.defaults.json'),
      verbose: false,
      reportFormErrors: false,
      coreVersion,
    });

    before(async () => { return await harness.start(); });
    after(async () => { return await harness.stop(); });
    beforeEach(async () => { return await harness.clear(); });
    afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

    describe('getTasks', () => {
      beforeEach(async () => {
        await harness.clear();
        await harness.setNow('2000-01-01');
      });

      it('followup task present one day before schedule', async () => {
        expect(harness.coreVersion).to.eq(coreVersion);
        const formResult = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
        expect(formResult.errors).to.be.empty;

        await harness.setNow('2000-01-07');
        const tasks = await harness.getTasks();
        expect(tasks).to.have.property('length', 1);
        expect(tasks[0]._id).to.include(`~org.couchdb.user:${harness.user._id}~`);
        expect(tasks[0]).to.nested.include({
          owner: 'patient_id',
          requester: 'patient_id',
          state: 'Ready',
          'emission.dueDate': '2000-01-07',
          'emission.icon': 'newborn',
          'emission.actions[0].form': 'pnc_followup',
        });

        const stateCount = await harness.countTaskDocsByState({ freshTaskDocs: false });
        expect(stateCount).to.deep.eq({
          Cancelled: 0,
          Completed: 0,
          Draft: 0,
          Failed: 0,
          Ready: 1,
          Total: 1,
        });
      });

      it('followup task present three days after schedule', async () => {
        const formResult = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
        expect(formResult.errors).to.be.empty;

        await harness.setNow('2000-01-10');
        const tasks = await harness.getTasks();
        expect(tasks).to.have.property('length', 1);
        expect(tasks[0]).to.nested.include({ state: 'Ready' });

        await harness.flush(30);
        const stateCount = await harness.countTaskDocsByState();
        expect(stateCount).to.deep.eq({
          Cancelled: 0,
          Completed: 0,
          Draft: 0,
          Failed: 1,
          Ready: 0,
          Total: 1,
        });
      });

      it('followup task not present at time of scheduling', async () => {
        const formResult = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
        expect(formResult.errors).to.be.empty;
        expect(await harness.getTasks()).to.be.empty;
      });
    });

    describe('getTarget', () => {
      it('basic trigger', async () => {
        harness.pushMockedDoc({ form: 'supervision_with_chw_confirmation', patient_id: 'chw_area_id', reported_date: Date.now() });
        harness.pushMockedDoc({ form: 'supervision_without_chw_confirmation', patient_id: 'chw_area_id', reported_date: Date.now() });
        harness.pushMockedDoc({ form: 'individual_feedback_confirmation', patient_id: 'chw_area_id', reported_date: Date.now() });
        
        const targets = await harness.getTargets({ type: 'chv-receive-supervision-visit' });
        expect(targets).to.have.property('length', 1);
        expect(targets[0]).to.nested.include({ 'value.total': 1, 'value.pass': 1 });
      });

      it('reports outside of current month are not considered', async () => {
        harness.pushMockedDoc({ form: 'supervision_with_chw_confirmation', patient_id: 'chw_area_id', reported_date: 1000000000000 });
        harness.pushMockedDoc({ form: 'supervision_without_chw_confirmation', patient_id: 'chw_area_id' });
        harness.pushMockedDoc({ form: 'individual_feedback_confirmation', patient_id: 'chw_area_id' });
        
        const targets = await harness.getTargets({ type: 'chv-receive-supervision-visit' });
        expect(targets).to.have.property('length', 1);
        expect(targets[0]).to.nested.include({ 'value.total': 1, 'value.pass': 0 });
      });
    });

    describe('loadAction', () => {
      it('receives action directly + multi-stage fill', async () => {
        await harness.setNow('2000-01-01');

        const scheduledDate = '2000-01-07';
        const initialResult = await harness.fillForm('pnc_followup', ['no'], ['yes', scheduledDate]);
        expect(initialResult.errors).to.be.empty;

        await harness.setNow(scheduledDate);
        const tasks = await harness.getTasks();
        expect(tasks).to.have.property('length', 1);
        
        expect(tasks[0].emission.actions[0]).to.include({ forId: 'patient_id' });
        await harness.loadAction(tasks[0].emission.actions[0]);
        const followupResult = await harness.fillForm(['no_come_back']);
        expect(followupResult.errors).to.be.empty;

        // This data is the result of a build-time shim forced into enketo
        expect(followupResult.report).to.nested.include({
          'fields.inputs.source': 'task',
          'fields.inputs.source_id': initialResult.report._id,
        });

        const actual = await harness.getTasks();
        expect(actual).to.be.empty;
      });

      it('receives task document + single-stage fill', async () => {
        await harness.setNow('2000-01-01');

        const scheduledDate = '2000-01-07';
        const initialResult = await harness.fillForm('pnc_followup', ['no'], ['yes', scheduledDate]);
        expect(initialResult.errors).to.be.empty;

        await harness.setNow(scheduledDate);
        const tasks = await harness.getTasks();
        expect(tasks).to.have.property('length', 1);
        
        expect(tasks[0].emission).to.include({ forId: 'patient_id' });
        const followupResult = await harness.loadAction(tasks[0], ['no_come_back']);
        expect(followupResult.errors).to.be.empty;

        // This data is the result of a build-time shim forced into enketo
        expect(followupResult.report).to.nested.include({
          'fields.inputs.source': 'task',
          'fields.inputs.source_id': initialResult.report._id,
        });

        const actual = await harness.getTasks();
        expect(actual).to.be.empty;
      });
    });
  });

  describe(`tests for RulesEngine v${coreVersion} (project-with-source)`, () => {
    const harness = new Harness({
      directory: path.join(__dirname, 'collateral', 'project-with-source'),
      xformFolderPath: path.join(__dirname, 'collateral', 'forms'),
      harnessDataPath: path.join(__dirname, 'collateral', 'harness.defaults.json'),
      coreVersion,
    });

    before(async () => { return await harness.start(); });
    after(async () => { return await harness.stop(); });
    beforeEach(async () => { return await harness.clear(); });
    afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

    it('cht.v1.hasPermissions', async () => {
      const isChtApiSupported = semver.gte(semver.coerce(coreVersion), '3.12.0');
      const expectedLength = isChtApiSupported ? 1 : 0;
      const chwTasks = await harness.getTasks();
      expect(chwTasks.length).to.eq(expectedLength);
      const chwTargets = await harness.getTargets();
      expect(chwTargets[0].value.total).to.eq(expectedLength);

      harness.userRoles = ['other'];
      const otherTasks = await harness.getTasks();
      expect(otherTasks.length).to.eq(0);
      const otherTargets = await harness.getTargets();
      expect(otherTargets[0].value.total).to.eq(0);
    });
  });
}
