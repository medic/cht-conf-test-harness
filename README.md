# Medic Test Harness for Projects

A test harness which facilitates tests which complete forms, inspect and interact with tasks and targets, or mock the passage of time.

## Getting Started

1. `npm run build`
1. Test that it is working locally with `npm test`

## Example Tests

A unit test for a form:
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
    await harness.loadAction(tasks[0].actions[0]);
    const followupResult = await harness.fillForm(['no_come_back']);
    expect(followupResult.errors).to.be.empty;

    // Verify the task got resolved
    const actual = await harness.getTasks();
    expect(actual).to.be.empty;
  });
```

## Mocking Contextual Data

Medic's Webapp makes three inputs available to enketo XForms:

1. **User** - This represents the current user that is logged into the system when opening a form, or viewing a task/target. If your form behaves differently for different user roles or user data.
1. **Content** - The "content" is an arbitrary object that is passed into a form when it is loaded. Tasks have the ability to set this data through the [modifyContent](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#task-schema) interface. And Contact Summaries have the ability to the content via the [context](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#context) attribute. 
1. **ContactSummary** - This is an xml representation of the [context](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#context) from a Contact Summary and is passed as an Enketo extra. You can read about Enketo extras [here](https://enketo.org/xforms/). 

Together with time, this data represents all of the inputs controlling how your forms, tasks, and targets appear. Medic-config-test-harness provides interfaces for mocking all inputs so you can easily test all possible behaviors of your configuration. To help reduce the verbosity of test cases, you can provide default values for all of these inputs by creating a file called `test.defaults.json` in your configuration project's ([example](https://github.com/medic/medic-conf-test-harness/blob/master/test/collateral/test.defaults.json)).

