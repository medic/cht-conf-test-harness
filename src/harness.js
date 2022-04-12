const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const jsonToXml = require('pojo2xml');
const process = require('process');
const PuppeteerChromiumResolver = require('puppeteer-chromium-resolver');
const sinon = require('sinon');
const uuid = require('uuid/v4');

const devMode = require('./dev-mode');
const coreAdapter = require('./core-adapter');
const ChtCoreFactory = require('./cht-core-factory');
const { toDate, toDuration } = require('./dateUtils');

const pathToHost = path.join(__dirname, 'form-host/form-host.html');
if (!fs.existsSync(pathToHost)) {
  console.error(`File does not exist at ${pathToHost}`);
}

/**
 * A harness for testing MedicMobile WebApp configurations
 *
 * @example
 * const Harness = require('cht-conf-test-harness');
 * const instance = new Harness({
 *   verbose: true,
 *   directory: '/home/me/config-me/',
 * });
 * await instance.start();
 * await instance.setNow('2000-01-01');
 * await instance.loadForm('my_xform');
 * const result = await instance.fillForm(['first page, first answer', 'first page, second answer'], ['second page, first answer']);
 * expect(result.errors).to.be.empty;
 * expect(result.report).to.deep.include({
 *  fields: {
 *    patient_name: 'Patient Name',
 *    next_pnc: {
 *      s_next_pnc: 'no',
 *      next_pnc_date: '',
 *    },
 *  }
 * });
 */
class Harness {
  /**
   *
   * @param {Object=} options Specify the behavior of the Harness
   * @param {boolean} [options.verbose=false] Detailed console logging when true
   * @param {boolean} [options.logFormErrors=false] Errors displayed by forms will be logged via console when true
   * @param {string} [options.directory=process' working directory] Path to directory of configuration files being tested
   * @param {string} [options.xformFolderPath=path.join(options.directory, 'forms')] Path to directory containing xform files
   * @param {string} [options.appXFormFolderPath=path.join(options.xformFolderPath, 'app')] Path used by the loadForm interface
   * @param {string} [options.contactXFormFolderPath=path.join(options.xformFolderPath, 'contact')] Path used by the fillContactForm interface
   * @param {string} [options.appSettingsPath=path.join(options.directory, 'app_settings.json')] Path to file containing app_settings.json to test
   * @param {string} [options.harnessDataPath=path.join(options.directory, 'harness.defaults.json')] Path to harness configuration file
   * @param {string} [options.coreVersion=harness configuration file] The version of cht-core to emulate @example "3.8.0"
   * @param {string} [options.user=harness configuration file] The default {@link HarnessInputs} controlling the environment in which your application is running
   * @param {string} [options.userRoles=harness configuration file] The default {@link HarnessInputs} controlling the environment in which your application is running
   * @param {string} [options.subject=harness configuration file] The default {@link HarnessInputs} controlling the environment in which your application is running
   * @param {Object} [options.content=harness configuration file] The default {@link HarnessInputs} controlling the environment in which your application is running
   * @param {Object} [options.contactSummary=harness configuration file] The default {@link HarnessInputs} controlling the environment in which your application is running
   * @param {boolean} [options.headless=true] The options object is also passed into Puppeteer and can be used to control [any of its options]{@link https://github.com/GoogleChrome/puppeteer/blob/v1.18.1/docs/api.md#puppeteerlaunchoptions}
   * @param {boolean} [options.slowMo=false] The options object is also passed into Puppeteer and can be used to control [any of its options]{@link https://github.com/GoogleChrome/puppeteer/blob/v1.18.1/docs/api.md#puppeteerlaunchoptions}
   */
  constructor(options = {}) {
    const defaultDirectory = options.directory || process.cwd();
    this.options = _.defaults(options, {
      verbose: false,
      logFormErrors: true,
      xformFolderPath: path.join(defaultDirectory, 'forms'),
      appSettingsPath: path.join(defaultDirectory, './app_settings.json'),
      harnessDataPath: path.join(defaultDirectory, './harness.defaults.json'),
    });
    this.options = _.defaults(options, {
      appXFormFolderPath: path.join(this.options.xformFolderPath, 'app'),
      contactXFormFolderPath: path.join(this.options.xformFolderPath, 'contact'),
    });

    this.log = (...args) => this.options.verbose && console.log('Harness', ...args);

    const fileBasedDefaults = loadJsonFromFile(this.options.harnessDataPath);
    this.defaultInputs = _.defaults(
      this.options,
      fileBasedDefaults,
      {
        subject: 'default_subject',
        user: 'default_user',
        userRoles: ['default_role'],
        content: { source: 'action' },
        docs: [
          { _id: 'default_user', type: 'contact' },
          { _id: 'default_subject', type: 'contact' },
        ],
        ownedBySubject: false,
        actionForm: undefined,
      }
    );

    if (process.argv.includes('--dev')) {
      this.options.useDevMode = true;
    }

    const { availableCoreVersions } = ChtCoreFactory;
    this.options = _.defaults(
      this.options,
      _.pick(fileBasedDefaults, 'coreVersion'),
      { coreVersion: availableCoreVersions[availableCoreVersions.length - 1] },
    );

    this.core = ChtCoreFactory.get(this.options.coreVersion);
    this.appSettings = loadJsonFromFile(this.options.appSettingsPath);
    if (!this.appSettings) {
      throw Error(`Failed to load app settings expected at: ${this.options.appSettingsPath}`);
    }

    if (this.options.useDevMode) {
      devMode.mockRulesEngine(this.core, this.options.appSettingsPath);
    }

    clearSync(this);
  }

  /**
   * Starts a virtual browser. Typically put this in your test's before [hook]{@link https://mochajs.org/#hooks} or alike.
   * @returns {Promise.Browser} Resolves a [Puppeteer Browser]{@link https://github.com/GoogleChrome/puppeteer/blob/v1.18.1/docs/api.md#class-browser} when the harness is ready.
   *
   * @example
   * before(async () => { return await harness.start(); });
   */
  async start() {
    const chromiumResolver = await PuppeteerChromiumResolver({ silent: !this.options.verbose });
    this.options.executablePath = chromiumResolver.executablePath;
    this.browser = await chromiumResolver.puppeteer.launch(this.options);
    this.page = await this.browser.newPage();
    this.page.on('console', msg => {
      this.log(msg.type(), msg.text());

      if (typeof this.onConsole === 'function') {
        this.onConsole(msg);
      }
    });

    await this.page.goto(`file://${pathToHost}`);
    await this.page.waitForSelector('#task-report');

    if (this._now) {
      await this.setNow(this._now);
    }

    return this.browser;
  }

  /**
   * Stops and cleans up the virtual browser.
   * @returns {Promise} Resolves when the harness is fully cleaned up.
   * @example
   * after(async () => { return await harness.stop(); });
   */
  async stop() {
    this.log('Closing harness');
    sinon.restore();
    return this.browser && this.browser.close();
  }

  /**
   * Resets the {@link HarnessState}
   * @returns {Promise} Resolves when the state of the harness when cleared
   */
  async clear() {
    clearSync(this);
    return this.page && await this.page.evaluate(() => delete window.now);
  }

  /**
   * Load a form from the app folder into the harness for testing
   *
   * @param {string} formName Filename of an Xml file describing an XForm to load for testing
   * @param {string} [options.user] You can override some or all of the {@link HarnessInputs} attributes.
   * @param {string} [options.subject=harness configuration file] You can override some or all of the {@link HarnessInputs} attributes.
   * @param {Object} [options.content=harness configuration file] You can override some or all of the {@link HarnessInputs} attributes.
   * @param {Object} [options.contactSummary=harness configuration file] You can override some or all of the {@link HarnessInputs} attributes.
   * @returns {HarnessState} The current state of the form
   * @deprecated Use fillForm interface (#40)
   */
  async loadForm(formName, options = {}) {
    if (!this.page) {
      throw Error(`loadForm(): Cannot invoke cht-conf-test-harness.loadForm() before calling start()`);
    }

    options = _.defaults(options, {
      subject: this.options.subject,
      content: this.options.content,
      user: this.options.user,
      userSettingsDoc: this.userSettingsDoc,
    });

    const xformFilePath = path.resolve(this.options.appXFormFolderPath, `${formName}.xml`);
    const content = await resolveContent(this.coreAdapter, this.state, options.content, options.subject);
    const contactSummary = options.contactSummary || await this.getContactSummary(content.contact);
    const serializedContactSummary = serializeContactSummary(contactSummary);

    await doLoadForm(this, this.page, xformFilePath, content, options.userSettingsDoc, serializedContactSummary);
    this._state.pageContent = await this.page.content();
    return this._state;
  }

  /**
   * @deprecated since version 2.4.1, use {@link fillContactCreateForm} instead
   * 
   * Loads and fills a contact form,
   *
   * @param {string} contactType Type of contact that should be created
   * @param  {...string[]} answers Provide an array for the answers given on each page. See fillForm for more details.
   */
  async fillContactForm(contactType, ...answers) {
    return this.fillContactCreateForm(contactType, ...answers);
  }

  /**
 * Loads and fills a contact form
 *
 * @param {string} contactType Type of contact that should be created
 * @param  {...string[]} answers Provide an array for the answers given on each page. See fillForm for more details.
 */
  async fillContactCreateForm(contactType, ...answers) {
    const fillResult = await fillContactForm(this, contactType, 'create', ...answers);
    this.pushMockedDoc(...fillResult.contacts);
    return fillResult;
  }

  /**
   * Loads and fills a contact edit form
   *
   * @param {string} contactType Type of contact that should be created
   * @param  {...string[]} answers Provide an array for the answers given on each page. See fillForm for more details.
   */
  async fillContactEditForm(contactType, ...answers) {
    const fillResult = await fillContactForm(this, contactType, 'edit', ...answers);
    const keepValueIfEmpty = (objValue, srcValue, key) => {
      return key === '_id' || _.isEmpty(srcValue) ? objValue : srcValue;
    };
    _.assignInWith(this.subject, fillResult.contacts[0], keepValueIfEmpty);
    return fillResult;
  }

  /**
   * Set the current mock-time of the harness. Mocks global time {@link https://sinonjs.org/releases/v1.17.6/fake-timers/|uses sinon}
   * @param {Date|DateTime|number|string} now A Date object, {@link https://moment.github.io/luxon/docs/class/src/datetime.js~DateTime.html|DateTime object} or a value which can be parsed into a Date
   */
  setNow(now) {
    if (!now) {
      throw Error('undefined date passed to setNow');
    }
    const asTimestamp = toDate(now).toMillis();
    this._now = asTimestamp;
    sinon.useFakeTimers(asTimestamp);
    return this.page && this.page.evaluate(innerNow => window.now = new Date(innerNow), this._now);
  }

  /**
   * Get the current mock-time. If no time has been set, defaults to the current system time.
   * @returns {number} The current mock-time as epoch time (set via `setNow` or `flush`). If time has not been mocked, defaults to the current system clock.
   */
  getNow() {
    return this._now || Date.now();
  }

  /**
   * Increment the current time by an amount
   * @param {Object|Duration|number} amount An object with attributes { years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds } describing how far to move forward in time, a {@link https://moment.github.io/luxon/docs/class/src/duration.js~Duration.html|Duration object} or a number describing how many days to move forward in time.
   * @example
   * await flush({ years: 1, minutes: 5 }); // move one year and 5 minutes forward in time
   * await flush(1); // move one day forward in time
   */
  async flush(amount) {
    let now = this._now || Date.now();
    now = toDate(now).plus(toDuration(amount));
    return this.setNow(now);
  }

  /**
   * Fills in a form given some answers
   * @param {Object|string} load An optional shorthand for loading a form before filling it. If a string is provided, this will be passed to {@link loadForm} as the formName.
   * If an Object is provided, it can have attributes { form, user, content, contactSummary }
   * @param {...string[]} answers Provide an array for the answers given on each page
   * @returns {FillResult} The result of filling the form
   * @example
   * // Load a form and then fill it in
   * await harness.loadForm('my_form');
   * const result = await harness.fillForm(['first page first answer', 'first page second answer'], ['second page first answer']);
   *
   * // Load and fill a form in one statement
   * const result = await harness.fillForm('my_form', ['1', '2'], ['3']});
   */
  async fillForm(...answers) {
    const [firstParam] = answers;
    if (!Array.isArray(firstParam)) {
      if (typeof firstParam === 'object') {
        const options = _.defaults(firstParam, this.options);
        await this.loadForm(firstParam.form, options);
      } else {
        await this.loadForm(firstParam);
      }

      answers.shift();
    }

    this.log(`Filling ${answers.length} pages with answer: ${JSON.stringify(answers)}`);
    const fillResult = await this.page.evaluate(async innerAnswer => await window.formFiller.fillAppForm(innerAnswer), answers);
    this.log(`Result of fill is: ${JSON.stringify(fillResult, null, 2)}`);

    if (this.options.logFormErrors && fillResult.errors && fillResult.errors.length > 0) {
      /* this.log respects verbose option, use logFormErrors here */
      console.error(`Error encountered while filling form:`, JSON.stringify(fillResult.errors, null, 2));
    }

    if (fillResult.report) {
      fillResult.additionalDocs.forEach(doc => { doc._id = uuid(); });
      this.pushMockedDoc(fillResult.report, ...fillResult.additionalDocs);
    }

    return fillResult;
  }

  /**
   * Check which tasks are visible
   * @param {Object=} options Some options when checking for tasks
   * @param {string} [options.title=undefined] Filter the returns tasks to those with attribute `title` equal to this value. Filter is skipped if undefined.
   * @param {Object} [options.user=Default specified via constructor] The current logged-in user which is viewing the tasks.
   * @param {Object} [options.userRoles=Default specified via constructor] The roles associated with the current logged-in user which is viewing the tasks.
   * @param {string} [options.actionForm] Filter task documents to only those whose action opens the form equal to this parameter. Filter is skipped if undefined.
   * @param {boolean} [options.ownedBySubject] Filter task documents to only those owned by the subject. Filter is skipped if false.
   *
   * @returns {Task[]} An array of task documents which would be visible to the user given the current {@link HarnessState}
   */
  async getTasks(options) {
    options = _.defaults(options, {
      subject: this.options.subject,
      user: this.options.user,
      userRoles: this.options.userRoles,
      actionForm: this.options.actionForm,
      ownedBySubject: this.options.ownedBySubject,
      title: undefined,
    });

    if (options.resolved) {
      throw Error('getTasks({ resolved: true }) is not supported. See getTaskDocStates() to understand the state of tasks.');
    }

    if (options.now) {
      throw Error('getTasks({ now }) is not supported. See setNow() for mocking time.');
    }

    const user = await resolveMock(this.coreAdapter, this.state, options.user);
    const subject = await resolveMock(this.coreAdapter, this.state, options.subject, { hydrate: false });
    const tasks = await this.coreAdapter.fetchTasksFor(user, options.userRoles, stateEnsuringPresenceOfMocks(this.state, user, subject));

    tasks.forEach(task => task.emission.actions.forEach(action => {
      action.forId = task.emission.forId; // required to hydrate contact in loadAction()
    }));

    return filterTaskDocs(tasks, subject._id, options);
  }

  /**
   * Counts the number of task documents grouped by state. [Explanation of task documents and states]{@link https://docs.communityhealthtoolkit.org/core/overview/db-schema/#tasks}
   *
   * @param {Object=} options Some options when summarizing the tasks
   * @param {string} [options.title=undefined] Filter task documents counted to only those with emitted `title` equal to this parameter. Filter is skipped if undefined.
   * @param {Object} [options.user=Default specified via constructor] The current logged-in user which is viewing the tasks.
   * @param {Object} [options.userRoles=Default specified via constructor] The roles associated with the current logged-in user which is viewing the tasks.
   * @param {string} [options.actionForm] Filter task documents counted to only those whose action opens the form equal to this parameter. Filter is skipped if undefined.
   * @param {boolean} [options.ownedBySubject] Filter task documents counted to only those owned by the subject. Filter is skipped if false.
   *
   * @returns Map with keys equal to task document state and values equal to the number of task documents in that state.
   * @example
   * const summary = await countTaskDocsByState({ title: 'my-task-title' });
   * expect(summary).to.nested.include({
   *   Complete: 1, // 1 task events were marked as resolved
   *   Failed: 2,   // 2 task events were not marked as resolved prior to expiring
   *   Draft: 3,    // 3 task events are in the future
   * });
   *
   */
  async countTaskDocsByState(options) {
    options = _.defaults(options, {
      subject: this.options.subject,
      actionForm: this.options.actionForm,
      ownedBySubject: this.options.ownedBySubject,
      title: undefined,
    });

    await this.getTasks(options);

    const allTaskDocs = await this.coreAdapter.fetchTaskDocs();
    const subjectId = typeof this.subject === 'object' ? this.subject._id : this.subject;
    const relevantTaskDocs = filterTaskDocs(allTaskDocs, subjectId, options);
    const summary = {
      Draft: 0,
      Ready: 0,
      Cancelled: 0,
      Completed: 0,
      Failed: 0,
      Total: 0,
    };

    for (const task of relevantTaskDocs) {
      summary[task.state]++;
      summary.Total++;
    }
    return summary;
  }

  /**
   * Check the state of targets
   * @param {Object=} options Some options for looking for checking for targets
   * @param {string|string[]} [options.type=undefined] Filter the returns targets to those with an `id` which matches type (when string) or is included in type (when Array).
   * @param {Object} [options.user=Default specified via constructor] The current logged-in user which is viewing the tasks.
   * @param {Object} [options.userRoles=Default specified via constructor] The roles associated with the current logged-in user which is viewing the tasks.
   *
   * @returns {Target[]} An array of targets which would be visible to the user
   */
  async getTargets(options) {
    options = _.defaults(options, {
      type: undefined,
      subject: this.options.subject,
      user: this.options.user,
      userRoles: this.options.userRoles,
    });

    if (options.now) {
      throw Error('getTargets({ now }) is not supported. See setNow() for mocking time.');
    }

    const user = await resolveMock(this.coreAdapter, this.state, options.user);
    const subject = await resolveMock(this.coreAdapter, this.state, options.subject, { hydrate: false });
    const targets = await this.coreAdapter.fetchTargets(user, options.userRoles, stateEnsuringPresenceOfMocks(this.state, user, subject));

    return targets
      .filter(target =>
        !options.type ||
        (typeof options.type === 'string' && target.id === options.type) ||
        (Array.isArray(options.type) && options.type.includes(target.id))
      );
  }

  /**
   * Simulates the user clicking on an action
   * @param {Object} taskDoc A {@link Task} or, if that task has multiple actions then one of the direct actions
   * @example
   * // Complete a form on January 1
   * await harness.setNow('2000-01-01')
   * const initialResult = await harness.fillForm('pnc_followup', ['no'], ['yes', '2000-01-07']);
   * expect(initialResult.errors).to.be.empty;
   *
   * // Verify a task appears on January 7
   * await harness.setNow('2000-01-07');
   * const tasks = await harness.getTasks();
   * expect(tasks).to.have.property('length', 1);
   *
   * // Complete the task's action
   * await harness.loadAction(tasks[0]);
   * const followupResult = await harness.fillForm(['no_come_back']);
   * expect(followupResult.errors).to.be.empty;
   *
   * // Verify the task got resolved
   * const actual = await harness.getTasks();
   * expect(actual).to.be.empty;
   */
  async loadAction(taskDoc, ...answers) {
    if (typeof taskDoc !== 'object') {
      throw Error('invalid argument: "taskDoc"');
    }

    const getActionFromParam = () => {
      const isTaskDoc = !!taskDoc.emission;
      if (isTaskDoc) {
        const { actions } = taskDoc.emission;
        if (!Array.isArray(actions) || actions.length === 0) {
          throw Error(`loadAction: invalid argument "taskDoc" - has no actions to load`);
        }

        if (actions.length > 1) {
          throw Error('loadAction: invalid argument "taskDoc" - has multiple actions, so disambiguation is required. Directly pass the action to load: `loadAction(taskDoc.emission.actions[1]);`');
        }

        return actions[0];
      }

      return taskDoc; // assume it is an action
    };

    const action = getActionFromParam();
    // When an action is clicked after Rules-v2 the "emissions.content.contact" object is hydrated
    const subject = this.state.contacts.find(contact => action.forId && contact._id === action.forId);
    const content = Object.assign(
      {},
      action.content,
      { contact: subject || this.content.contact },
    );

    let result = await this.loadForm(action.form, { content });
    if (answers.length) {
      result = await this.fillForm(...answers);
    }
    return result;
  }

  /**
   * A filtered set of errors inside of state.console. Useful for easy assertions.
   * @example
   * expect(harness.consoleErrors).to.be.empty;
   */
  get consoleErrors() {
    return this._state.console
      .filter(msg => msg.type() !== 'log')
      .filter(msg => msg.text() !== 'Failed to load resource: net::ERR_UNKNOWN_URL_SCHEME');
  }

  /**
   * `user` from the {@link HarnessInputs} set through the constructor (defaulting to values from harness.defaults.json file)
   */
  get user() {
    const { user } = this.options;
    if (typeof user === 'string') {
      return this.state.contacts.find(contact => contact._id === user);
    }
    return user;
  }
  set user(value) { this.options.user = value; }

  /**
   * `userRoles` from the {@link HarnessInputs} set through the constructor (defaulting to values from harness.defaults.json file)
   */
  get userRoles() { return this.options.userRoles; }
  set userRoles(value) { this.options.userRoles = value; }

  /**
   * `coreVersion` is the version of the cht-core that is being emulated in testing (eg. 3.9.0)
   */
  get coreVersion() { return this.options.coreVersion; }

  /**
   * `content` from the {@link HarnessInputs} set through the constructor (defaulting to values from harness.defaults.json file)
   */
  get content() { return this.options.content; }
  set content(value) { this.options.content = value; }

  get subject() {
    const { subject } = this.options;
    if (typeof subject === 'string') {
      return this.state.contacts.find(contact => contact._id === subject);
    }
    return subject;
  }
  set subject(value) { this.options.subject = value; }


  /**
   * `userSettingsDoc` from the {@link HarnessInputs} set through the constructor
   * @default {Object} A constructed object of type `user-settings` https://docs.communityhealthtoolkit.org/core/overview/db-schema/#users based on
   * known user information
   */
  get userSettingsDoc() {
    if (this.options.userSettingsDoc) {
      return this.options.userSettingsDoc;
    }

    const user = this.user;
    if (!user) {
      return undefined;
    }

    return {
      _id: `org.couchdb.user:${user._id}`,
      name: user._id,
      type: 'user-settings',
      contact_id: user._id,
      facility_id: user.parent && user.parent._id,
    };
  }
  set userSettingsDoc(value) { this.options.userSettingsDoc = value; }

  /**
   * @typedef HarnessState
   * @property {Object[]} console Each element represents an event within Chrome console.
   * @property {Object[]} contacts All contacts known to nools.
   * @property {Object[]} reports All reports known to nools.
   */

  /**
   * Details the current {@link HarnessState} of the Harness
   * @returns {HarnessState} The current state of the harness
   */
  get state() { return this._state; }

  /**
   * Push a mocked document directly into the state
   * @param {Object} docs The document to push
   */
  pushMockedDoc(...docs) {
    const ContactTypes = ['contact', 'district_hospital', 'health_center', 'clinic', 'person'];

    for (const doc of docs) {
      if (Array.isArray(doc)) {
        this.pushMockedDoc(...doc);
        continue;
      }

      // Cht only stores minified contacts and reports - so harness defaults to do the same
      this.coreAdapter.minify(doc);

      const isContact = doc && ContactTypes.includes(doc.type);
      if (isContact) {
        this._state.contacts.push(doc);
      } else {
        const report = _.defaults(doc, {
          _id: uuid(),
          type: 'data_record',
          reported_date: 1,
          fields: {},
        });

        const reportSubjectId = this.core.RegistrationUtils.getSubjectId(report);
        if (!reportSubjectId && this.subject) {
          // Legacy behaviour from harness@1.x
          console.warn(`pushMockedDoc: report without subject id (patient_id, patient_uuid, place_id, etc). Setting default to "${this.subject._id}".`);
          report.patient_id = this.subject._id; // patient_uuid is not available at root level
        }

        this._state.reports.push(report);
      }
    }
  }

  /**
   * @typedef ContactSummary
   * As defined in the [guide to developing community health applications]{@link https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#contact-summaries}
   * @property {Field[]} fields
   * @property {Card[]} cards
   * @property {Context} context
   */

  /**
   * Obtains the result of the running the contact-summary.js or the compiled contact-summary.templated.js scripts from the project folder
   * @param {string} [contact] The contact doc that will be passed into the contactSummary script. Given a {string}, a contact will be loaded and hydrated from {@link HarnessState}. If left empty, the subject will be used.
   * @param {Object[]} [reports] An array of reports associated with contact. If left empty, the contact's reports will be loaded from {@link HarnessState}.
   * @param {Object[]} [lineage] An array of the contact's hydrated ancestors. If left empty, the contact's ancestors will be used from {@link HarnessState}.
   * @returns {ContactSummary} The result of the contact summary under test.
   */
  async getContactSummary(contact, reports, lineage) {
    const self = this;
    const resolvedContact = await resolveMock(this.coreAdapter, this.state, contact || this.options.subject);
    if (typeof resolvedContact !== 'object') {
      throw `Harness: Cannot get summary for unknown or invalid contact.`;
    }

    const reportHasMatchingSubject = report => self.core.RegistrationUtils.getSubjectId(report) === resolvedContact._id;
    const resolvedReports = Array.isArray(reports) ? [...reports] : self._state.reports.filter(reportHasMatchingSubject);

    let resolvedLineage = [];
    if (Array.isArray(lineage)) {
      resolvedLineage.push(...lineage);
    } else {
      const user = await resolveMock(this.coreAdapter, this.state, this.options.user);
      const subject = await resolveMock(this.coreAdapter, this.state, this.options.subject);
      resolvedLineage = await this.coreAdapter.buildLineage(resolvedContact._id, stateEnsuringPresenceOfMocks(this.state, user, subject));
    }

    if (this.options.useDevMode) {
      return devMode.runContactSummary(this.options.appSettingsPath, resolvedContact, resolvedReports, resolvedLineage);
    } else {
      const contactSummaryFunction = new Function('contact', 'reports', 'lineage', self.appSettings.contact_summary);
      return contactSummaryFunction(resolvedContact, resolvedReports, resolvedLineage);
    }
  }
}

/**
 * Loads and fills a contact form with the appropriate action
 *
 * @param {string} contactType Type of contact that should be created
 * @param {string} action one of 'create' or 'edit'
 * @param  {...string[]} answers Provide an array for the answers given on each page. See fillForm for more details.
 */
const fillContactForm = async (self, contactType, action, ...answers) => {
  const xformFilePath = path.resolve(self.options.contactXFormFolderPath, `${contactType}-${action}.xml`);

  const user = await resolveMock(self.coreAdapter, self.state, self.options.user);
  await doLoadForm(self, self.page, xformFilePath, {}, user);
  self._state.pageContent = await self.page.content();

  self.log(`Filling ${answers.length} pages with answer: ${JSON.stringify(answers)}`);
  const fillResult = await self.page.evaluate(async (innerContactType, innerAnswer) => await window.formFiller.fillContactForm(innerContactType, innerAnswer), contactType, answers);
  self.log(`Result of fill is: ${JSON.stringify(fillResult, null, 2)}`);

  // https://github.com/medic/cht-conf-test-harness/issues/105
  if (self.subject && self.subject.parent) {
    fillResult.contacts.forEach(contact => {
      if (!contact.parent || !contact.parent._id) {
        contact.parent = self.subject.parent;
      }
    });
  }

  if (self.options.logFormErrors && fillResult.errors && fillResult.errors.length > 0) {
    /* this.log respects verbose option, use logFormErrors here */
    console.error(`Error encountered while filling form:`, JSON.stringify(fillResult.errors, null, 2));
  }
  return fillResult;
};

const loadJsonFromFile = filePath => {
  const content = readFileSync(filePath);
  return content && JSON.parse(content);
};

const readFileSync = (...args) => {
  const filePath = path.join(...args);
  if (!fs.existsSync(filePath)) {
    return;
  }

  return fs.readFileSync(filePath).toString();
};

const doLoadForm = async (self, page, xformFilePath, content, user, contactSummaryXml) => {
  self.log(`Loading form ${path.basename(xformFilePath)}...`);
  const xform = readFileSync(xformFilePath);
  if (!xform) {
    throw Error(`XForm not available at path: ${xformFilePath}`);
  }
  self.onConsole = msg => self._state.console.push(msg);

  const formNameWithoutDirectory = path.basename(xformFilePath, '.xml');
  const loadXformWrapper = (innerFormName, innerForm, innerContent, innerUser, innerContactSummary) => window.loadXform(innerFormName, innerForm, innerContent, innerUser, innerContactSummary);
  await page.evaluate(loadXformWrapper, formNameWithoutDirectory, xform, content, user, contactSummaryXml);
};

const serializeContactSummary = (contactSummary = {}) => {
  if (typeof contactSummary !== 'object') {
    throw Error('Invalid contactSummary. Object is expected');
  }

  if (contactSummary.xmlStr) {
    return contactSummary;
  }

  const serialize = cs => ({ id: 'contact-summary', xmlStr: jsonToXml(cs) });
  if (contactSummary.context) {
    return serialize({ context: contactSummary.context });
  }

  return serialize({ context: contactSummary });
};

const clearSync = (self) => {
  const contacts = [];

  self.options = _.cloneDeep(self.defaultInputs);
  self.coreAdapter = new coreAdapter(self.core, self.appSettings);

  self._state = {
    console: [],
    contacts,
    reports: [],
  };
  self.onConsole = () => { };
  self._now = undefined;

  sinon.restore();
  self.pushMockedDoc(...self.options.docs);
};

const resolveContent = async (coreAdapter, state, content, contact) => {
  if (content && !content.contact) {
    const resolvedContact = await resolveMock(coreAdapter, state, contact);
    return { ...content, contact: resolvedContact };
  }

  return content;
};

const resolveMock = async (coreAdapter, state, mock, options = {}) => {
  options = _.defaults(options, { hydrate: true });
  if (typeof mock === 'string') {
    if (options.hydrate) {
      return coreAdapter.fetchHydratedDoc(mock, state);
    }

    return state.contacts.find(contact => contact._id === mock);
  }

  return mock;
};

const filterTaskDocs = (taskDocs, subjectId, { ownedBySubject, actionForm, title }) => taskDocs
  .filter(task => !ownedBySubject || task.owner === subjectId)
  .filter(task => !actionForm || task.emission.actions[0].form === actionForm)
  .filter(task => !title || task.emission.title === title);

const stateEnsuringPresenceOfMocks = (state, ...mocks) => {
  const stragglers = _.uniqBy(mocks.filter(mock => !state.contacts.some(contact => contact._id === mock._id), '_id'));
  return {
    contacts: [...state.contacts, ...stragglers],
    reports: state.reports,
  };

};

module.exports = Harness;
