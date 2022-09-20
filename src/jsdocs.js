/**
 * [CHT Task Documents]{@link https://docs.communityhealthtoolkit.org/core/overview/db-schema/#tasks}.
 * @typedef Task
 * @property {uuid} _id
 * @property {string} user The user settings id of the user who calculated and created the document. Used for controlling replication. (eg. org.couchdb.user:agatha)
 * @property {uuid} requester The guid of the contact whose data brought about the creation of the document. Used for controlling cancellation.
 * @property {uuid} owner string The guid of the contact whose profile this task will appear on in the contact’s tab.
 * @property {Object} emission	Minified data emitted from the partner code.
 * @property {uuid} emission.forId	If completing a task’s action opens a form. Completing the form creates a report. forId is the guid of the contact information that will be passed into the form. For most forms, the resulting report will be associated with this contact.
 * @property {string} emission.title The "name" attribute of the [task configuration]{@link https://docs.communityhealthtoolkit.org/apps/reference/tasks/#tasksjs}
 * @property {string} emission.contact.name The name that will appear beside the task on the tasks tab. The "contactLabel" attribute of the [task configuration]{@link https://docs.communityhealthtoolkit.org/apps/reference/tasks/#tasksjs}
 * @property {date} emission.startDate The date at which time the task will be displayed to the user. Before this date, the task document will be in state "Draft".
 * @property {date} emission.endDate The date at which time the task will no longer be displayed to the user. After this date, the task will move to state "Failed".
 * @property {Array} stateHistory Each time the state attribute changes, the time of the change is recorded in the state history.
 */

/**
 * An emitted target. The structure of emitted targets may vary by the version of cht-conf and the version of the medic webapp. In general, target have this structure.
 * @typedef Target
 * @property {Object} value The aggregated calculation based on the instances.
 * @property {boolean} value.pass
 * @property {number} value.total
 * @property {number} value.percent
 *
 */

/**
 * cht-conf-test-harness provides interfaces for mocking all inputs so you can easily test the possible behaviors of your configuration.
 * The data of the HarnessInputs represents the environment/data in which your forms, tasks, targets, and contact-summaries are running within your CHT application.
 *
 * You can provide default values for these inputs through a file called `harness.defaults.json` in your configuration project's folder ([example](https://github.com/medic/cht-conf-test-harness/blob/master/harness.defaults.json.example)).
 *
 * @typedef HarnessInputs
 * @property {string|Object} user This represents the current user that is logged into the system. Use this for testing whenever your system behaves differently for different users.
 * In harness.fillForm(), this is the data bound to `inputs/user` (hydrated).
 * In harness.getTargets(), this is the global `user` object available in targets.js. (hydrated)
 * In harness.getTasks(), this is the global `user` object available in tasks.js. (hydrated)
 * In contact-summary code, this is the global `user` object in contact-summary.templated.js. (hydrated)
 * @see userRoles For setting the user's role
 *
 * @property {Array<string>} userRoles This represents the 'roles' assigned to the current user that is logged in. Roles control the user's permissions ([roles documentation](https://docs.communityhealthtoolkit.org/apps/concepts/users/#roles))
 * @example harness.userRoles = ['chw']
 * 
 * @property {string|Object} subject This represents the contact that is being "acted on" or the "subject of the test".
 * The harness.fillForm() function simulates "completing an action" on the subject's profile page.
 * The harness.getTasks() function returns the tasks listed on the subject's profile page.
 * The harness.getContactSummary() function returns the contact summary information displayed for the subject.
 *
 * `subject` can be an `object` or a `string`. Assigning `subject` a `string` should be preferred as it will result in behavior closest to the CHT. The `subject` should be set to the `_id` of the contact document present
 * in `HarnessInputs.docs`. The harness will pull in the appropriate contact and hydrate it automatically.  Assigning `subject` an `object` will skip any integration with `docs` and skips hydration - the exact value set
 * will be used. This is powerful and useful for unit testing, but should be avoided during integration testing.
 *
 * @example <caption>harness.defaults.json using subject as a string (preferred)</caption>
 *
 * {
 *   "coreVersion": "3.10.3",
 *   "subject": "patient_id",
 *
 *   "docs": [
 *     {
 *       "_id": "patient_id",
 *       "name": "Sick Bob",
 *       "type": "person",
 *       "reported_date": 1550559625153,
 *       "parent": {
 *         "_id": "family_id",
 *         "parent": {
 *           "_id": "chw_area_id"
 *         },
 *       }
 *     },
 *
 *     {
 *       "_id": "family_id",
 *       "type": "clinic",
 *       "parent": {
 *         "_id": "chw_area_id"
 *       },
 *     },
 *   ]
 * }
 *
 * @example <caption>harness.defaults.json using mock object</caption>
 *
 * {
 *   "coreVersion": "3.10.3",
 *   "subject":  {
 *     "_id": "patient_id",
 *     "name": "Sick Bob",
 *     "type": "person",
 *     "reported_date": 1550559625153,
 *     "parent": {
 *       "_id": "family_id",
 *       "type": "clinic",
 *       "parent": {
 *         "_id": "chw_area_id"
 *       },
 *     }
 *   },
 *
 *   "docs": []
 * }
 *
 *
 * @property {Object} content This is the data that will be passed into an XForm via loadForm(). Tasks have the ability to set this data via the
 * [modifyContent]{@link https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#task-schema} interface.
 * Recommendeded to leave this undefined in `harness.defaults.json`.
 *
 * @property {Object} contactSummary Set this value to mock the data passed into app forms via `instance('contact-summary')/context`. This is mocking the
 * [context]{@link https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#context} information that is
 * returned by the contact-summary.  If left empty, the `context` returned by {@link getContactSummary} will be used.
 *
 * @property {Object[]} docs This simulates the documents on the user's device when the test begins.
 */
