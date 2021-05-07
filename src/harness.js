const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const jsonToXml = require('pojo2xml');
const process = require('process');
const PuppeteerChromiumResolver = require('puppeteer-chromium-resolver');
const sinon = require('sinon');

const RegistrationUtils = require('cht-core-3-11/shared-libs/registration-utils');
const rulesEngineAdapter = require('./rules-engine-adapter');
const toDate = require('./toDate');

const pathToHost = path.join(__dirname, 'form-host/form-host.html');
if (!fs.existsSync(pathToHost)) {
  console.error(`File does not exist at ${pathToHost}`);
}

/**
 * A harness for testing MedicMobile WebApp configurations
 * 
 * @example
 * const Harness = require('medic-conf-test-harness');
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
   * @param {HarnessInputs} [options.inputs=loaded from harnessDataPath] The default {@link HarnessInputs} for loading and completing a form
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
    this.defaultInputs = _.defaults(this.options.inputs, fileBasedDefaults);

    this.appSettings = loadJsonFromFile(this.options.appSettingsPath);
    if (!this.appSettings) {
      throw Error(`Failed to load app settings expected at: ${this.options.appSettingsPath}`);
    }
    this.clear();  
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
    const contacts = [];

    this.options.inputs = _.cloneDeep(this.defaultInputs);
    if (this.rulesEngineAdapter) {
      this.rulesEngineAdapter.destroy();
    }
    this.rulesEngineAdapter = new rulesEngineAdapter(this.appSettings);
    
    if (this.options.inputs.user && this.options.inputs.user.parent) {
      contacts.push(_.cloneDeep(this.options.inputs.user.parent));
    }

    if (this.options.inputs.content && this.options.inputs.content.contact) {
      const defaultContact = _.cloneDeep(this.options.inputs.content.contact);

      // 92 - Link the default contact information by default
      this.options.inputs.content.contact = defaultContact;
      contacts.push(defaultContact);
    }

    this._state = {
      console: [],
      contacts,
      reports: [],
    };
    this.onConsole = () => {};
    this._now = undefined;

    sinon.restore();
    return this.page && await this.page.evaluate(() => delete window.now);
  }

  /**
   * Load a form from the app folder into the harness for testing
   * 
   * @param {string} formName Filename of an Xml file describing an XForm to load for testing
   * @param {HarnessInputs} [inputs=Default values specified via constructor] You can override some or all of the {@link HarnessInputs} attributes.
   * @returns {HarnessState} The current state of the form
   * @deprecated Use fillForm interface (#40)
   */
  async loadForm(formName, inputs) {
    const xformFilePath = path.resolve(this.options.appXFormFolderPath, `${formName}.xml`);
    
    inputs = _.defaults(inputs, this.options.inputs);
    const serializedContactSummary = serializeContactSummary(inputs.contactSummary || this.contactSummary);
    await doLoadForm(this, this.page, xformFilePath, inputs.content, inputs.user, serializedContactSummary);
    this._state.pageContent = await this.page.content();
    return this._state;
  }

  /**
   * Loads and fills a contact form, 
   * 
   * @param {string} contactType Type of contact that should be created
   * @param  {...string[]} answers Provide an array for the answers given on each page. See fillForm for more details.
   */
  async fillContactForm(contactType, ...answers) {
    const xformFilePath = path.resolve(this.options.contactXFormFolderPath, `${contactType}-create.xml`);
    await doLoadForm(this, this.page, xformFilePath, {}, this.options.user);
    
    this.log(`Filling ${answers.length} pages with answer: ${JSON.stringify(answers)}`);
    const fillResult = await this.page.evaluate(async (innerContactType, innerAnswer) => await window.formFiller.fillContactForm(innerContactType, innerAnswer), contactType, answers);
    this.log(`Result of fill is: ${JSON.stringify(fillResult, null, 2)}`);

    if (this.options.logFormErrors && fillResult.errors && fillResult.errors.length > 0) {
      /* this.log respects verbose option, use logFormErrors here */
      console.error(`Error encountered while filling form:`, JSON.stringify(fillResult.errors, null, 2));
    }

    this.pushMockedDoc(...fillResult.contacts);
    return fillResult;
  }

  /**
   * Set the current mock-time of the harness. Mocks global time {@link https://sinonjs.org/releases/v1.17.6/fake-timers/|uses sinon}
   * @param {Date|number|string} now A Date object or a value which can be parsed into a Date
   * 
   */
  setNow(now) {
    if (!now) {
      throw Error('undefined date passed to setNow');
    }

    const parseableNow = typeof now === 'object' ? now.getTime() : now;
    const asTimestamp = toDate(parseableNow).getTime();
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
   * @param {Object|number} amount Either an object describing how far to move forward in time. Has attributes { years, days, hours, minutes, seconds, ms }. Or an number describing how many days to move forward in time.
   * @example
   * await flush({ years: 1, minutes: 5 }); // move one year and 5 minutes forward in time
   * await flush(1); // move one day forward in time
   */
  async flush(amount) {
    let now = this._now || Date.now();
    if (typeof amount === 'object') {
      const { years = 0, days = 0, hours = 0, minutes = 0, seconds = 0, ms = 0 } = amount;
      now = now +
        years   * 1000 * 60 * 60 * 24 * 365 +
        days    * 1000 * 60 * 60 * 24 +
        hours   * 1000 * 60 * 60 +
        minutes * 1000 * 60 +
        seconds * 1000 +
        ms;
    } else { // shorthand is for days
      now += amount * 24 * 60 * 60 * 1000;
    }
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
        const inputs = _.defaults(firstParam, this.options.inputs);
        await this.loadForm(firstParam.form, inputs);
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
      this.pushMockedDoc(fillResult.report, ...fillResult.additionalDocs);
    }

    return fillResult;
  }

  /**
   * Check which tasks are emitted
   * @param {Object=} options Some options when checking for tasks
   * @param {Date} [options.now=getNow()] The mocked time to look for tasks
   * @param {boolean} [options.resolved=false] When true, tasks which are resolved will be included in the returned tasks.
   * @param {string} [options.title=undefined] Filter the returns tasks to those with attribute `title` equal to this value. Filter is skipped if undefined.
   * @param {Object} [options.user=Default specified via constructor] The current logged-in user which is viewing the tasks.
   * 
   * @returns {Task[]} An array of tasks which would be visible to the user given the current {@link HarnessState}
   */
  async getTasks(options) {
    options = _.defaults(options, {
      now: () => new Date(this.getNow()),
      resolved: false,
      title: undefined,
      user: this.user,
    });
    
    await this.setNow(options.now()); // ? Why is now a function? Is it always?
    const tasks = await this.rulesEngineAdapter.fetchTasksFor(options.user, this._state.contacts, this._state.reports);
    // TODO: restore now?
    return tasks
      .map(task => task.emission)
      .filter(task => !!options.resolved || !task.resolved)
      .filter(task => !options.title || task.title === options.title);
  }

  /**
   * Check which targets are emitted
   * @param {Object=} options Some options for looking for checking for targets
   * @param {Date} [options.now=getNow()] The mocked time to look for targets
   * @param {string|string[]} [options.type=undefined] Filter the returns targets to those with an `id` which matches type (when string) or is included in type (when Array).
   * 
   * @returns {Target[]} An array of targets which would be visible to the user
   */
  async getTargets(options) {
    options = _.defaults(options, {
      now: () => new Date(this.getNow()),
      type: undefined,
    });
    
    const targets = await this.rulesEngineAdapter.fetchTargets(options.user, this._state.contacts, this._state.reports);
    return targets
      .filter(target =>
        !options.type ||
        (typeof options.type === 'string' && target.id === options.type) ||
        (Array.isArray(options.type) && options.type.includes(target.id))
      );
  }

  /**
   * Simulates the user clicking on an action
   * @param {Object} action A {@link Task}'s action 
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
   * await harness.loadAction(tasks[0].actions[0]);
   * const followupResult = await harness.fillForm(['no_come_back']);
   * expect(followupResult.errors).to.be.empty;
   * 
   * // Verify the task got resolved
   * const actual = await harness.getTasks();
   * expect(actual).to.be.empty;
   */
  async loadAction(action) {
    // When an action is clicked after Rules-v2 the "emissions.content.contact" object is hydrated
    const content = Object.assign(
      {},
      action.content,
      { contact: this.content.contact }
    );
    return this.loadForm(action.form, { content });
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
   * `user` from the {@link HarnessInputs} set through the constructor of the harness.defaults.json file
   */
  get user() { return this.options.inputs.user; }

  /**
   * `content` from the {@link HarnessInputs} set through the constructor of the harness.defaults.json file
   */
  get content() { return this.options.inputs.content; }

  /**
   * `contactSummary` can be set explicitly through the {@link HarnessInputs} via the constructor or the harness.defaults.json file. 
   * If no contactSummary is explicitly defined, returns the calculation from getContactSummary().
   */
  get contactSummary() {
    return this.options.inputs.contactSummary || this.getContactSummary();
  }
  set contactSummary(value) {
    this.options.inputs.contactSummary = value;
  }

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

      const isContact = doc && ContactTypes.includes(doc.type);
      if (isContact) {
        this._state.contacts.push(doc);
      } else {
        const report = _.defaults(doc, {
          reported_date: 1,
          fields: {},
        });

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
   * @param {string} [contact] The contact doc that will be passed into the contactSummary script. Given a {string}, a contact will be loaded from {@link HarnessState}. If left empty, the content's contact will be used if one exists.
   * @param {Object[]} [reports] An array of reports associated with contact. If left empty, the contact's reports will be loaded from {@link HarnessState}.
   * @param {Object[]} [lineage] An array of the contact's hydrated ancestors. If left empty, the contact's ancestors will be used from {@link HarnessState}.
   * @returns {ContactSummary} The result of the contact summary under test.
   */
  getContactSummary(contact = this.content.contact, reports, lineage) {
    if (!contact) {
      return {};
    }

    const self = this;
    const getContactById = id => self._state.contacts.find(contact => contact._id === id);
    const resolvedContact = typeof contact === 'string' ? getContactById(contact) : contact;
    if (typeof resolvedContact !== 'object') {
      throw `Harness: Cannot get summary for unknown or invalid contact.`;
    }

    const resolvedReports = Array.isArray(reports) ? [...reports] : self._state.reports.filter(report => RegistrationUtils.getSubjectId(report) === contact._id);
    
    const resolvedLineage = [];
    if (Array.isArray(lineage)) {
      resolvedLineage.push(...lineage);
    } else {
      for (let current = resolvedContact.parent; current; current = current.parent) {
        const parent = current._id ? getContactById(current._id) || current : current;
        resolvedLineage.push(parent);
      }
    }
    
    const contactSummaryFunction = new Function('contact', 'reports', 'lineage', self.appSettings.contact_summary);
    return contactSummaryFunction(resolvedContact, resolvedReports, resolvedLineage);
  }
}

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

module.exports = Harness;
