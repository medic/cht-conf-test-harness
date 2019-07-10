/**
 * An emitted task. The structure of emitted tasks may vary by the version of medic-conf and the version of the medic webapp. In general, tasks have this structure.
 * @typedef Task 
 * @property {uuid} _id
 * @property {boolean} deleted
 * @property {Object} doc
 * @property {Object} contact
 * @property {string} icon
 * @property {string} date
 * @property {boolean} resolved
 * @property {string} priority
 * @property {string} priorityLabel
 * @property {Object[]} actions
 */

/**
 * An emitted target. The structure of emitted targets may vary by the version of medic-conf and the version of the medic webapp. In general, target have this structure.
 * @typedef Target
 * @property {Object} value The aggregated calculation based on the instances.
 * @property {boolean} value.pass
 * @property {number} value.total
 * @property {number} value.percent
 * 
 * @property {Object[]} instances The raw emitted target from Nools.
 * @property {string} instances[x]._id
 * @property {boolean} instances[x].deleted
 * @property {type} instances[x].type
 * @property {boolean} instances[x].pass 
 * @property {string} instances[x].date
 */

/**
 * Medic's Webapp makes several inputs available to your XForms, tasks, and targets.
 * The data of the HarnessInputs represents all of the inputs controlling how forms, tasks, and targets behave within the WebApp. 
 * Medic-config-test-harness provides interfaces for mocking all inputs so you can easily test the possible behaviors of your configuration. 
 * To help reduce the verbosity of test cases, you can provide default values for all of these inputs by creating a file called `harness.defaults.json` in your configuration project's ([example](https://github.com/medic/medic-conf-test-harness/blob/master/harness.defaults.json.example)).
 * @typedef HarnessInputs
 * @property {Object} user This represents the current user that is logged into the system. 
 * In your XForm, this data mocks the `inputs/user` XPath. And in your task/target code, this data mocks the global `user` object. 
 * Use this for testing whenever your forms, tasks, or targets behaves differently for different users or are expected to capture user data.
 * @property {Object} content The "content" is an object that is passed into the XForm when it is loaded.
 * Tasks have the ability to set this data through the [modifyContent]{@link https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#task-schema} interface.
 * Contact Summaries have the ability to set this via the [context]{@link https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#context} attribute.
 * @property {Object} contactSummary This is an xml representation of the [context]{@link https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#context} from a Contact Summary and is passed as an Enketo extra.
 * You can read about [Enketo extras]{@link https://enketo.org/xforms/}.
 */
