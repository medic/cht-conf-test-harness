const md5 = require('md5');
const PouchDB = require('pouchdb');
const uuid = require('uuid/v4');

const ddocs = require('../dist/core-ddocs.json');
const RegistrationUtils = require('cht-core-3-11/shared-libs/registration-utils');
const CalendarInterval = require('cht-core-3-11/shared-libs/calendar-interval');
const RulesEmitter = require('cht-core-3-11/shared-libs/rules-engine/src/rules-emitter.js');
const RulesEngineCore = require('cht-core-3-11/shared-libs/rules-engine');

PouchDB.plugin(require('pouchdb-adapter-memory'));

class RulesEngineAdapter {
  constructor(appSettings) {
    this.appSettings = appSettings;
    this.pouchdb = new PouchDB(`medic-conf-test-harness-${uuid()}`, { adapter: 'memory' });
    this.rulesEngine = RulesEngineCore(this.pouchdb);
    
    // TODO: Explain this?
    this.committedDocHashes = {};
  }

  destroy() {
    // TODO: destroy causes all kinds of problems with async behaviour of rules engine (setTimeout?)
    // this.pouchdb.destroy();
  }

  async fetchTargets(user, contacts, reports) {
    await prep(this.appSettings, this.pouchdb, this.rulesEngine, this.committedDocHashes, user, contacts, reports);

    const uhcMonthStartDate = getMonthStartDate(this.appSettings);
    const relevantInterval = CalendarInterval.getCurrent(uhcMonthStartDate);
    return this.rulesEngine.fetchTargets(relevantInterval);
  }

  async fetchTasksFor(user, contacts, reports) {
    await prep(this.appSettings, this.pouchdb, this.rulesEngine, this.committedDocHashes, user, contacts, reports);
    return this.rulesEngine.fetchTasksFor();
  }
}

const prep = async (appSettings, pouchdb, rulesEngine, docHashes, user, contacts, reports) => {
  const rulesSettings = getRulesSettings(appSettings, user);
  if (!rulesEngine.isEnabled()) {
    await rulesEngine.initialize(rulesSettings);
  } else {
    // This is largely to handle scenarios where the "user" object has changed 
    // TODO: Wish that rulesConfigChange returned true/false 
    await rulesEngine.rulesConfigChange(rulesSettings);
  }

  /*
  The Date object inside Nools doesn't work with sinon useFakeTimers (closure?)
  So this is a terribly vicious hack to reset that internal component and restart the nools session
  I hate nools
  */
  if (RulesEmitter.isEnabled) {
    RulesEmitter.shutdown();
    RulesEmitter.initialize({
      rules: appSettings.tasks.rules,
      contact: user,
    });
  }

  // TODO: Only if ?
  await pouchdb.bulkDocs(ddocs);

  const docs = [...contacts, ...reports];
  for (const doc of docs) {
    delete doc._rev; // ignore _rev entirely and permanently
    const docHash = md5(JSON.stringify(doc));
    const docId = doc._id;
    if (!docId) {
      throw Error(`Doc has attribute _id ${docId}`); // TODO: Is this the right behaviour?
    }

    if (docHashes[docId] !== docHash) {
      await upsert(pouchdb, doc);

      const subjectId = getSubjectId(doc);
      if (subjectId) {
        await rulesEngine.updateEmissionsFor(subjectId);
      }
    }
    docHashes[docId] = docHash;
  }
};

const upsert = async (pouchdb, doc) => {
  const existing = await pouchdb.get(doc._id)
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }
    });

  const docWithRev = Object.assign({}, doc, { _rev: existing && existing._rev });
  await pouchdb.put(docWithRev);
};

const getSubjectId = doc => {
  if (!doc) {
    return;
  }

  const isReport = doc => doc.type === 'data_record';
  return isReport(doc) ? RegistrationUtils.getSubjectId(doc) : doc._id;
};

// cht-core/src/ts/services/uhc-settings.service.ts
const getMonthStartDate = settings => {
  return settings &&
    settings.uhc &&
    (
      settings.uhc.month_start_date ||
      settings.uhc.visit_count &&
      settings.uhc.visit_count.month_start_date
    );
};

const getRulesSettings = (settingsDoc, userContactDoc) => {
  const settingsTasks = settingsDoc && settingsDoc.tasks || {};
  // const filterTargetByContext = (target) => target.context ?
  //   !!this.parseProvider.parse(target.context)({ user: userContactDoc }) : true;
  const targets = settingsTasks.targets && settingsTasks.targets.items || [];

  return {
    rules: settingsTasks.rules,
    taskSchedules: settingsTasks.schedules,
    targets: targets,
    enableTasks: true,
    enableTargets: true,
    contact: userContactDoc,
    user: userContactDoc, // TODO which is actually user?
    monthStartDate: getMonthStartDate(settingsDoc),
  };
};

module.exports = RulesEngineAdapter;

// TODO: Remove ?
process.on('unhandledRejection', err => {
  console.log('unhandledRejection', err);
});
