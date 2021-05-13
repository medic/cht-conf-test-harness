const md5 = require('md5');
const PouchDB = require('pouchdb');
const uuid = require('uuid/v4');

const RegistrationUtils = require('cht-core-3-11/shared-libs/registration-utils');
const CalendarInterval = require('cht-core-3-11/shared-libs/calendar-interval');
const RulesEmitter = require('/home/kenn/harness/src/dev-rules-emitter');
const RulesEngineCore = require('cht-core-3-11/shared-libs/rules-engine');

const ddocs = require('../dist/core-ddocs.json');
const StubbedNoolsLib = require('./stubbed-medic-conf-nools-lib');

PouchDB.plugin(require('pouchdb-adapter-memory'));

class RulesEngineAdapter {
  constructor(appSettings) {
    this.appSettings = appSettings;
    this.pouchdb = new PouchDB(`medic-conf-test-harness-${uuid()}`, { adapter: 'memory' });
    this.rulesEngine = RulesEngineCore(this.pouchdb);
    
    // TODO: Explain this?
    this.previousDocSummary = {};
  }

  destroy() {
    // TODO: destroy causes all kinds of problems with async behaviour of rules engine (setTimeout?)
    // this.pouchdb.destroy();
  }

  async fetchTargets(user, contacts, reports) {
    await prepareRulesEngine(this.rulesEngine, this.appSettings, user, this.pouchdb.name);
    const { updatedSubjectIds, docSummary } = await syncPouchWithState(this.pouchdb, this.previousDocSummary, contacts, reports);
    this.previousDocSummary = docSummary;
    await this.rulesEngine.updateEmissionsFor(updatedSubjectIds);

    const uhcMonthStartDate = getMonthStartDate(this.appSettings);
    const relevantInterval = CalendarInterval.getCurrent(uhcMonthStartDate);
    return this.rulesEngine.fetchTargets(relevantInterval);
  }

  async fetchTasksFor(user, contacts, reports) {
    await prepareRulesEngine(this.rulesEngine, this.appSettings, user, this.pouchdb.name);
    const { updatedSubjectIds, docSummary } = await syncPouchWithState(this.pouchdb, this.previousDocSummary, contacts, reports);
    this.previousDocSummary = docSummary;
    await this.rulesEngine.updateEmissionsFor(updatedSubjectIds);

    return this.rulesEngine.fetchTasksFor();
  }

  async fetchTaskDocs() {
    const options = { startkey: `task~`, endkey: `task~\ufff0`, include_docs: true };
    const result = await this.pouchdb.allDocs(options);
    return result.rows.map(row => row.doc);
  }
}

const prepareRulesEngine = async (rulesEngine, appSettings, user, sessionId) => {
  const rulesSettings = getRulesSettings(appSettings, user, sessionId);
  if (!rulesEngine.isEnabled()) {
    await rulesEngine.initialize(rulesSettings);
  } else {
    // Handle scenarios where the "user" object has changed 
    // TODO: Wish that rulesConfigChange returned true/false 
    await rulesEngine.rulesConfigChange(rulesSettings);
  }

  /*
  The Date object inside Nools doesn't work with sinon useFakeTimers (closure?)
  So this is a terribly vicious hack to reset that internal component and restart the nools session
  I hate nools
  */
  // TODO: Pipe this in from above
  StubbedNoolsLib.pathToProject = '/home/kenn/config-muso';
  if (RulesEmitter.isEnabled()) {
    RulesEmitter.shutdown();
    RulesEmitter.initialize({
      rules: appSettings.tasks.rules,
      contact: user,
    });
  }
};

const syncPouchWithState = async (pouchdb, previousDocSummary, contacts, reports) => {
  // TODO: Only if ?
  await pouchdb.bulkDocs(ddocs);

  const docs = [...contacts, ...reports];
  
  // build the doc summary
  const docSummary = {};
  for (const doc of docs) {
    const docId = doc._id;
    if (!docId) {
      throw Error(`Doc has attribute _id ${docId}`); // TODO: Is this the right behaviour?
    }
    delete doc._rev; // ignore _rev entirely and permanently

    if (docSummary[docId]) {
      throw Error(`Harness state contains docs with duplicate id ${docId}.`);
    }

    docSummary[docId] = {
      subjectId: getSubjectId(doc),
      docHash: md5(JSON.stringify(doc)),
    };
  }

  // sync added/changed docs to pouchdb
  const updatedSubjects = new Set();
  for (const doc of docs) {
    const docId = doc._id;
    const { docHash, subjectId } = docSummary[docId];
    // new or changed
    if (!previousDocSummary[docId] || previousDocSummary[docId].docHash !== docHash) {
      await upsert(pouchdb, doc);
      if (subjectId) {
        updatedSubjects.add(subjectId);
      }
    }
  }

  // sync removed docs to pouchdb
  const removedDocIds = Object.keys(previousDocSummary).filter(docId => !docSummary[docId]);
  if (removedDocIds.length) {
    const impactedSubjects = removedDocIds.map(docId => previousDocSummary[docId].subjectId);
    updatedSubjects.add(...impactedSubjects);

    const deleteDoc = docId => upsert(pouchdb, { _id: docId, _deleted: true });
    await Promise.all(removedDocIds.map(deleteDoc));
  }
  
  return {
    updatedSubjectIds: Array.from(updatedSubjects),
    docSummary,
  };
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

const getRulesSettings = (settingsDoc, userContactDoc, sessionId) => {
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
    sessionId,
  };
};

module.exports = RulesEngineAdapter;
