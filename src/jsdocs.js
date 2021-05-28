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
 * An emitted target. The structure of emitted targets may vary by the version of medic-conf and the version of the medic webapp. In general, target have this structure.
 * @typedef Target
 * @property {Object} value The aggregated calculation based on the instances.
 * @property {boolean} value.pass
 * @property {number} value.total
 * @property {number} value.percent
 *
 */

/**
 * Medic-config-test-harness provides interfaces for mocking all inputs so you can easily test the possible behaviors of your configuration.
 * The data of the HarnessInputs represents all of the inputs controlling how forms, tasks, and targets behave within the WebApp.
 * To help reduce the verbosity of harness setup, you can provide default values for these inputs through a file called `harness.defaults.json` in your configuration project's folder ([example](https://github.com/medic/medic-conf-test-harness/blob/master/harness.defaults.json.example)).
 * @typedef HarnessInputs
 * @property {Object} user This represents the current user that is logged into the system.
 * In your XForm, this data mocks the `inputs/user` data. And in the task and target code, this data mocks the global `user` object.
 * Use this for testing whenever your forms, tasks, or targets behave differently for whenever different users are expected to capture user data.
 * @property {Object} content This is an object that is passed into the XForm when it is loaded.
 * Tasks have the ability to set this data through the [modifyContent]{@link https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#task-schema} interface.
 * @property {Object} contactSummary Contact Summaries have the ability to set a [context]{@link https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#context}. This
 * interface allows for the mocking of the output of the contact summary. If left empty, the context returned by {@link getContactSummary} will be used.
 */
