const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const getNoolsInstances = require('./get-nools-instances');
const mergeInstanceToTarget = require('./merge-instances-to-target');
const toDate = require('./toDate');

// TODO: Inject this data information through some sort of nice interface
const { user, content } = require('./data');

const pathToHost = path.join(__dirname, 'form-host/form-host.html');
if (!fs.existsSync(pathToHost)) {
  console.error(`File does not exist at ${pathToHost}`);
}

class Harness {
  constructor(options = {}) {
    this.options = _.defaults(options, {
      verbose: false,
      reportFormErrors: true,
      xformFolderPath: path.join(__dirname, 'forms'),
      appSettingsPath: path.join(__dirname, '../../app_settings.json'),
    });
    this.log = (...args) => options.verbose && console.log('HarnessRunner', ...args);
    const appSettingsText = readFileSync(this.options.appSettingsPath);
    this.appSettings = JSON.parse(appSettingsText);
    this.clear();
  }

  async start() {
    this.browser = await puppeteer.launch(this.options);
    this.page = await this.browser.newPage();
    this.page.on('console', msg => {
      this.log(msg.type(), msg.text());

      if (typeof this.onConsole === 'function') {
        this.onConsole(msg);
      }
    });

    await this.page.goto(`file://${pathToHost}`);
    await this.page.waitForSelector('#task-report');

    return this.browser;
  }

  async stop() {
    this.log('Closing harness');
    return this.browser && await this.browser.close();
  }

  async clear() {
    this.state = {
      console: [],
      resources: [],
      contacts: [_.clone(user.parent), _.clone(content.contact)],
      reports: [],
    };
    this.onConsole = () => {};
    this._now = undefined;
    return this.page && await this.page.evaluate(() => delete window.now);
  }

  async loadForm(formName, formContent = content, formUser = user) {
    this.log(`Loading form ${formName}...`);
    const xform = readFileSync(this.options.xformFolderPath, `${formName}.xml`);
    this.onConsole = msg => this.state.console.push(msg);
    await this.page.evaluate((innerFormName, innerForm, innerContent, innerUser) => window.loadXform(innerFormName, innerForm, innerContent, innerUser), formName, xform, formContent, formUser);
    this.state.pageContent = await this.page.content();
    return this.state;
  }

  setNow(now) {
    const parseableNow = typeof now === 'object' ? now.getTime() : now;
    this._now = toDate(parseableNow).getTime();
    return this.page.evaluate(innerNow => window.now = new Date(innerNow), this._now);
  }

  getNow() {
    return this._now || Date.now();
  }

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
        ms
    } else { // shorthand is for days
      now += amount * 24 * 60 * 60 * 1000;
    }
    return this.setNow(now);
  }

  async fillForm(...answers) {
    const [firstParam] = answers;
    if (!Array.isArray(firstParam)) {
      if (typeof firstParam === 'object') {
        await this.loadForm(firstParam.form, firstParam.content || content, firstParam.user || user);
      } else {
        await this.loadForm(firstParam, content);
      }

      answers.shift();
    }
  
    this.log(`Filling ${answers.length} pages with answer: ${JSON.stringify(answers)}`);
    const fillResult = await this.page.evaluate(async (innerAnswer) => await window.formFiller.fill(innerAnswer), answers);
    this.log(`Result of fill is: ${JSON.stringify(fillResult, null, 2)}`);

    if (this.options.reportFormErrors && fillResult.errors && fillResult.errors.length > 0) {
      /* this.log respects verbose option, use reportFormErrors here */
      console.error(`Error encountered while filling form:`, JSON.stringify(fillResult.errors, null, 2));
    }

    if (fillResult.report) {
      this.state.reports.push(fillResult.report);
      fillResult.report._id = this.state.reports.length.toString();
    }

    return fillResult;
  }

  async getTasks(options) {
    options = _.defaults(options, {
      now: () => new Date(this.getNow()),
      resolved: false,
      title: undefined,
    });
    
    const { tasks } = await getNoolsInstances(this.appSettings, user, this.state.contacts, this.state.reports, options.now);
    return tasks
      .filter(task => !!options.resolved || !task.resolved)
      .filter(task => !options.title || task.title === options.title);
  }

  async getEmittedTargetInstances(options) {
    options = _.defaults(options, {
      now: () => new Date(this.getNow()),
      type: undefined,
    });
    
    const { targets } = await getNoolsInstances(this.appSettings, user, this.state.contacts, this.state.reports, options.now);
    const targetsByUniqId = targets.reduce((prev, curr) => Object.assign(prev, { [curr._id]: curr }), {});
    return Object.values(targetsByUniqId)
      .filter(target =>
        !options.type ||
        (typeof options.type === 'string' && target.type === options.type) ||
        (Array.isArray(options.type) && options.type.includes(target.type))
      );
  }

  async getTargets(options) {
    options = _.defaults(options, {
      now: () => new Date(this.getNow()),
      type: undefined,
    });
    
    const targetTemplates = this.appSettings.tasks.targets.items.map(item => _.clone(item));
    const instances = await this.getEmittedTargetInstances(options);
    instances.forEach(instance => mergeInstanceToTarget(targetTemplates, instance, options.now));
    return targetTemplates
      .filter(target =>
        !options.type ||
        (typeof options.type === 'string' && target.id === options.type) ||
        (Array.isArray(options.type) && options.type.includes(target.id))
      );
  }

  async loadAction(action) {
    return this.loadForm(action.form, action.content);
  }

  get consoleErrors() {
    return this.state.console
      .filter(msg => msg.type() !== 'log')
      .filter(msg => msg.text() !== 'Failed to load resource: net::ERR_UNKNOWN_URL_SCHEME');
  }

  pushMockedReport(report) {
    report = _.defaults(report, {
      patient_id: content.contact._id,
      reported_date: 1,
      fields: {},
    });

    this.state.reports.push(report);
  }
};

const readFileSync = (...args) => {
  const filePath = path.join(...args);
  if (!fs.existsSync(filePath)) {
    console.error(`File path does not exist at ${filePath}`);
  }
  return fs.readFileSync(filePath).toString();
};

module.exports = Harness;
