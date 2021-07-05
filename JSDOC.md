# Medic Test Harness for Projects

A test harness which facilitates automated integration tests for [CHT Applications](https://docs.communityhealthtoolkit.org/apps/).

API:
* [Harness](https://docs.communityhealthtoolkit.org/cht-conf-test-harness/Harness.html)
* [Globals](https://docs.communityhealthtoolkit.org/cht-conf-test-harness/global.html)

## Getting Started

1. Install the harness `npm install --save cht-conf-test-harness chai`.
1. Create the below sample test file updating the `formName` variable.
1. Run your tests via Mocha.

```JavaScript
const { expect } = require('chai');

const Harness = require('cht-conf-test-harness');
const harness = new Harness({ verbose: true });

describe('Getting started tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => { return await harness.clear(); });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  const formName = 'my_form';
  it(`${formName} can be loaded`, async () => {
    await harness.loadForm(`app/${formName}`);
    expect(harness.state.pageContent).to.include(`id="${formName}"`);
  });
});
```

## Example Tests

A unit test for a hypothetical "pnc_followup" application form:
```JavaScript
it('unit test confirming no pnc followup', async () => {
  // Load the pnc_followup form and fill in 'no' on the first page and 'no' on the second page
  const result = await harness.fillForm('pnc_followup', ['no'], ['no']);

  // Verify that the form successfully got submitted
  expect(result.errors).to.be.empty;

  // Verify some attributes on the resulting report
  expect(result.report.fields).to.deep.include({
    patient_name: 'Patient Name',
    s_pnc_visits: {
      s_pnc_visit: 'no',
      s_pnc_planned_date_show: '',
      s_pnc_date_show: '',
    },
    next_pnc: {
      s_next_pnc: 'no',
      next_pnc_date: '',
    }
  });
});
```

A test which confirms a task gets triggered and then resolved:
```JavaScript
  it('integration test confirming task appears on scheduled date of pnc followup', async () => {
    // Complete a form on January 1
    await harness.setNow('2000-01-01')
    const initialResult = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
    expect(initialResult.errors).to.be.empty;

    // Verify a task appears on January 7
    await harness.setNow('2000-01-07');
    const tasks = await harness.getTasks();
    expect(tasks).to.have.property('length', 1);

    // Complete the task's action
    await harness.loadAction(tasks[0]);
    const followupResult = await harness.fillForm(['no_come_back']);
    expect(followupResult.errors).to.be.empty;

    // Verify the task got resolved
    const actual = await harness.getTasks();
    expect(actual).to.be.empty;
  });
```

## Getting Started as a Developer

1. `npm run build`
1. Test that it is working locally with `npm test`
