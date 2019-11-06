const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');

const Harness = require('../src/harness');

describe('initializations', () => {
  it('harness defaults not required', async () => {
    const harness = new Harness({
      directory: path.resolve(__dirname, 'collateral/project-without-defaults'),
    });

    expect(harness.state).to.deep.eq({
      console: [],
      contacts: [],
      reports: [],
    });

    harness.state.contacts.push({ _id: 'contact' });
    harness.state.reports.push({ _id: 'report', 'patient_id': 'contact' });
    const targetInstances = await harness.getEmittedTargetInstances();
    expect(targetInstances).to.be.empty;

    const targets = await harness.getTargets();
    expect(targets).to.be.empty;

    const tasks = await harness.getTasks();
    expect(tasks).to.be.empty;
  });
});
