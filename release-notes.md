# cht-conf-test-harness Release Notes

## 4.0.0

### Breaking Changes

Adds support for CHT Core Framework version `4.6`. This version of the test harness is not backwards compatible with earlier versions of the CHT Core Framework.

- Uplift to use cht-form web component (#245)

## 3.0.15

- Fix filling out `time` questions (#250) ([3eb9bc0f](https://github.com/medic/cht-conf-test-harness/commit/3eb9bc0f))

## 3.0.14

- fix(#240): contact-summary should be passed reports of selected contact and its children (#246) ([bb51e1db](https://github.com/medic/cht-conf-test-harness/commit/bb51e1db))
- fix(#247): fill forms using the android app launcher (#248) ([7a6b16d1](https://github.com/medic/cht-conf-test-harness/commit/7a6b16d1))

## 3.0.13

- Support for cht-conf v3.19.0 and above (#243) ([93ad986f](https://github.com/medic/cht-conf-test-harness/commit/93ad986f))

## 3.0.12

- #239: fail to save app form due to TypeError (#241) ([b9ce73be](https://github.com/medic/cht-conf-test-harness/commit/b9ce73be))

## 3.0.11

- #234: Update test harness name ([d42ddc7a](https://github.com/medic/cht-conf-test-harness/commit/d42ddc7a))
- Update formfiller to support elements with type datetime([6a327de9](https://github.com/medic/cht-conf-test-harness/commit/6a327de9))

## 2.4.4

- Log errors thrown when filling a form ([478e3426](https://github.com/medic/cht-conf-test-harness/commit/478e3426))

## 3.0.10

- Fix script paths for project-explorer js resources (#231) ([ab7e4f9d](https://github.com/medic/cht-conf-test-harness/commit/ab7e4f9d))
- Disable db-object-widget (#210) ([bf773b4e](https://github.com/medic/cht-conf-test-harness/commit/bf773b4e))

## 2.4.3

- Strip console.debug from cht-conf-test-harness build output (#227) ([3c672753](https://github.com/medic/cht-conf-test-harness/commit/3c672753))

## 3.0.8

- Workaround for ERR_REQUEST_RANGE_NOT_SATISFIABLE (#225) ([ce40429f](https://github.com/medic/cht-conf-test-harness/commit/ce40429f))

## 3.0.7

- Add missing jQuery boilerplate from cht-core to handle self-closing tags in model.xml (#228) ([3bda9f47](https://github.com/medic/cht-conf-test-harness/commit/3bda9f47))

## 3.0.6

- 113 - strip console debug statements (#226) ([a93c267c](https://github.com/medic/cht-conf-test-harness/commit/a93c267c))

## 3.0.5

- Add cht API as global to contact-summary (#215) ([9a91335c](https://github.com/medic/cht-conf-test-harness/commit/9a91335c))

## 3.0.3

- Label semver a production dependency (#209) ([b1b2954e](https://github.com/medic/cht-conf-test-harness/commit/b1b2954e))

## 3.0.2

- Convert DateTime and Date objects to strings before passing to Form-Filler (#206) ([19f22fb1](https://github.com/medic/cht-conf-test-harness/commit/19f22fb1))

## 3.0.1

- Re-build with latest cht-4-0 branch (#198) ([cd7ebb34](https://github.com/medic/cht-conf-test-harness/commit/cd7ebb34))
- Reference xsltproc dependencies from ext folder instead of node_modules (#202) ([e03b2a64](https://github.com/medic/cht-conf-test-harness/commit/e03b2a64))

## 3.0.0

- Update jsdocs.js (#172) ([ce6040d4](https://github.com/medic/cht-conf-test-harness/commit/ce6040d4))
- Support for cht-core v4.0 Enketo Uplift (#159) ([02df52c0](https://github.com/medic/cht-conf-test-harness/commit/02df52c0))

## 2.4.2

- Update run-tests.yml (#171) ([8a697223](https://github.com/medic/cht-conf-test-harness/commit/8a697223))
- Fill contact edit forms (#162) ([bdca4952](https://github.com/medic/cht-conf-test-harness/commit/bdca4952))

## 2.4.0

- Add support for cht-core 3.13 (including parse-timestamp-to-date) (#153) ([562ed5b4](https://github.com/medic/cht-conf-test-harness/commit/562ed5b4))
- Improve check for DateTime/Duration (#146) ([501c1ee6](https://github.com/medic/cht-conf-test-harness/commit/501c1ee6))
- Revert change in behaviour for RFC2822 date strings (#161) ([983562b9](https://github.com/medic/cht-conf-test-harness/commit/983562b9))
- Support for cht-core v3.14 including new xpath functions for Bikram Sambat ([55fd75e7](https://github.com/medic/cht-conf-test-harness/commit/55fd75e7))
-  ([a3615516](https://github.com/medic/cht-conf-test-harness/commit/a3615516))

## 2.3.0

- Support for cht-core v3.12 and the cht-script-api (#151) ([764ca934](https://github.com/medic/cht-conf-test-harness/commit/764ca934))

## 2.2.5

- Gracefully handle empty forms (#132) ([9478fcd0](https://github.com/medic/cht-conf-test-harness/commit/9478fcd0))

## 2.2.4

- Add CONTRIBUTING guide (#129) ([6dbef598](https://github.com/medic/cht-conf-test-harness/commit/6dbef598))
- Bump chromium resolver (#140) ([1ddf0781](https://github.com/medic/cht-conf-test-harness/commit/1ddf0781))

## 2.2.3

- Improve date handling (#118) ([39fe990f](https://github.com/medic/cht-conf-test-harness/commit/39fe990f))
- FillForm - Fails to answer questions with "falsey answers" like 0 (#128) ([93de03c5](https://github.com/medic/cht-conf-test-harness/commit/93de03c5))

## 2.2.2

- BUG - Fix compatibility for projects using rules.nools.js (#119) ([a42a2ac2](https://github.com/medic/cht-conf-test-harness/commit/a42a2ac2))

## 2.2.1

- Pass the userSettingsDoc into Enketo not the userContactDoc (#109) ([a3615516](https://github.com/medic/cht-conf-test-harness/commit/a3615516))

## 2.2.0

The repository and npm package have been renamed to `cht-conf-test-harness`.

## 2.1

### `--dev` parameter allows debugging of CHT application code

For projects using the declarative configuration system, users can now set breakpoints in their CHT application code (eg. `tasks.js`, `targets.js`, etc). To do this, run mocha with the `--dev` flag. This makes tests powered by your application's JavaScript directly - you don't need to run `medic-conf compile-app-settings`, you can set breakpoints directly, get code coverage metrics, etc. [Technical](https://github.com/medic/medic-conf-test-harness/pull/103#issue-645043513)

The behaviour of the harness without `--dev` more closely aligns with the behaviour of code in production. This is a productivity tool - **the use of --dev is not recommended for official (CI) test runs.**

## 2.0

### BREAKING - Tests are powered by the cht-core's shared-libs

Prior versions of the harness were powered by a system which “behaves like” [cht-core](https://github.com/medic/cht-core) v3.6. `medic-conf-test-harness version 2` updates the harness to use actual cht-core code so tests behave like your production system. Based on the version of cht-core that your application is using in production, the harness can pull in the appropriate versioned components from cht-core to create an integration test experience which mirrors production.

The version of cht-core which is used to power your tests can be set in `harness.defaults.json`:

```json
{
  "coreVersion": "3.10.3",
  ...
}
```

or each time the harness is instantiated:

```javascript
const Harness = require('medic-conf-test-harness');
const harness = new Harness({ coreVersion: '3.10.3' });
```

### BREAKING - Interface change "harness.subject"

`harness.subject` is a new interface which allows for the easy manipulation and mocking of the contact that is being "acted on" -- "subject of the test". It is intended to replace logic which previously manipulated the awkward `harness.content.contact` or `harness.state.contacts[0]`.

* The `fillForm()` function simulates completing an app form on the subject's profile page.
* The `getContactSummary()` function returns the contact summary displayed for the subject.
* The `getTasks()` function returns the tasks listed on the subject's profile page.
 
 `harness.subject` can be assigned an `object` or a `string`. 
 
Assign `subject` the `_id` together with minified mock contact documents. The harness will hydrate the specified contact.
 
```json
{
  "coreVersion": "3.10.3",
  "subject": "patient_id",
 
  "docs": [
    {
      "_id": "patient_id",
      "name": "Sick Bob",
      "type": "person",
      "parent": {
        "_id": "family_id",
        "parent": {
          "_id": "chw_area_id"
        },
      }
    },
 
    {
      "_id": "family_id",
      "type": "clinic",
      "parent": {
        "_id": "chw_area_id"
      },
    },
  ]
}
```

```javascript
const Harness = require('medic-conf-test-harness');
const harness = new Harness({ subject: 'chw_id', user: 'supervisor_id' });
```

Assigning `subject` an `object` skips hydration or any manipulation of the value provided - the exact value set will be the data used. This is powerful and fast, useful for mocking and unit testing - but should likely be avoided for integration testing.

```javascript
const Harness = require('medic-conf-test-harness');
const harness = new Harness();

harness.subject = {
  _id: 'patient_id',
  name: 'Sick Bob',
  type: 'person',
  parent: {
    _id: 'family_id',
    type: 'clinic',
    foo: 'bar',
  }
};

```

Scenario | Before | After
-- | -- | --
Get DoB of the contact I'm testing | `harness.content.contact.date_of_birth` | `harness.subject.date_of_birth`
Make this test for a family | `harness.state.contacts[0] = { _id: 'family', type: 'clinic' }` | `harness.subject = 'family_id';`
What tasks are on the CHWs profile | `harness.state.contacts.push(harness.user.parent.contact);` | `harness.subject = harness.user;`
Only show tasks for contact I'm testing | `harness.state.contacts = [harness.content.contact];` | default behaviour

### Breaking Changes
1. Tests are now powered by the RulesEngine v2 which was released in cht-core v3.8 which included numerous [breaking changes](https://github.com/medic/cht-core/blob/master/release-notes/docs/3.8.0.md#breaking-changes)
    1. Projects running cht-core <3.8 should continue to use medic-conf-test-harness@1.x.
    2. Typically, if a test breaks because of these changes - that’s a good thing. You have found a bug in the production behaviour of your application.
2. `harness.defaults.json` 
   1. New optional string attribute `coreVersion` captures the cht-core version to power your tests (eg. “3.11.0”)
   2. New optional array attribute `docs` defines initial documents in the system
   3. New optional attribute `subject` (see above)
   4. Existing attribute `user` can now also be a string _id_ (see above)
3. `getTasks()`
    1. Passing option `{ resolved: true }` is no longer supported. Use `countTaskDocsByState()` to make assertions about resolved tasks.
    2. Passing option `{ now }` is no longer supported. Use `setNow()` for all datetime mocking.
    3. Return value is now a [Task Document](https://docs.communityhealthtoolkit.org/core/overview/db-schema/#tasks). It previously was a task emission, which is equivalent to `ret.emission` except that: 1) emissions contain a minified contact object (name attribute only), 2) emissions contain attribute `content.contact` which is now a minimized contact object (`_id` only)
4. `getTargets()`
    1. Passing option `{ now }` no longer supported. Use `setNow()` for all mocking.
    2. Returns `{ total: 0 }` instead of `undefined` when a target has counted nothing.
5. `pushMockedDoc()`
    1. Mocked documents must have a unique `_id`
    2. Stores minified documents (that is the same that the CHT stores)
6. Harness now requires node 10 or above (dropping support for legacy node versions)
7. `getEmittedTargetInstances()` has been removed
8. `getContactSummary` interface is now `async`
9.  `loadAction` - Now accepts task documents as input. So instead of calling `loadAction(task.actions[0])`, the interface now accepts `loadAction(task)` for tasks with a single action. Use `harness.loadAction(task.emission.actions[1])` for task documents with multiple actions.
10. `content`
    1. `content.contact` is automatically populated with `harness.subject` (hydrated) if undefined
    2. `content.contact` is undefined by default

## Changes
1. New interface `countTaskDocsByState()` counts the number of task documents grouped by state. Returns `{ Completed: 1, Failed: 2, Ready: 1, ... }`
2. Enketo form filling updated to support x-path extensions added in cht-core v3.7

## 1.0.0
~~This is an experimental project which remains in alpha testing. There may be breaking changes released as patches until version 1.0 is published.~~

## 0.1.30

* Removes the `pushMockedReport` interface and replaces it with a new `pushMockedDoc` which can accept either report or contact documents.
* Deprecates the `loadForm` interface, users should use the `fillForm`.
