const { expect } = require('chai');
const path = require('path');

const Harness = require('../src/harness');

describe('initializations', () => {
  it('harness defaults not required', async () => {
    const harness = new Harness({
      directory: path.resolve(__dirname, 'collateral/project-without-defaults'),
    });

    expect(harness.state).to.deep.eq({
      console: [],
      contacts: [
        { _id: 'default_user', type: 'contact' },
        { _id: 'default_subject', type: 'contact' },
      ],
      reports: [],
    });

    harness.state.contacts.push({ _id: 'contact' });
    harness.state.reports.push({ _id: 'report', 'patient_id': 'contact' });
    const targets = await harness.getTargets();
    expect(targets).to.be.empty;

    const tasks = await harness.getTasks();
    expect(tasks).to.be.empty;
  });

  it('mocking datetime before start() + stop halts mocking', async() => {
    const harness = new Harness({
      directory: path.join(__dirname, 'collateral', 'project-without-source'),
      xformFolderPath: path.join(__dirname, 'collateral', 'forms'),
    });

    const expectedTime = 1000;
    await harness.setNow(expectedTime);
    expect(new Date().getTime()).to.eq(expectedTime);

    await harness.start();
    const result = await harness.fillForm('pnc_followup', ['no_come_back']);
    expect(result.errors).to.be.empty;
    expect(result.report.reported_date).to.eq(expectedTime);

    await harness.stop();
    expect(new Date().getTime()).to.not.eq(expectedTime);
  });
});
