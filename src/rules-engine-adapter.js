/**
 * @module rules-engine-adapter
*/

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
    this.pouchdbStateHash = {};
  }

  destroy() {
    // destroying pouchdb synchronously causes many errors from asynchronous behaviour in RulesEngine
    const self = this;
    setTimeout(() => self.pouchdb.destroy(), 100);
  }

  async fetchTargets(user, state) {
    this.pouchdbStateHash = await prepare(this.rulesEngine, this.appSettings, this.pouchdb, this.pouchdbStateHash, user, state);

    const uhcMonthStartDate = getMonthStartDate(this.appSettings);
    const relevantInterval = CalendarInterval.getCurrent(uhcMonthStartDate);
    return this.rulesEngine.fetchTargets(relevantInterval);
  }

  async fetchTasksFor(user, state) {
    this.pouchdbStateHash = await prepare(this.rulesEngine, this.appSettings, this.pouchdb, this.pouchdbStateHash, user, state);
    return this.rulesEngine.fetchTasksFor();
  }

  async fetchTaskDocs() {
    const options = { startkey: `task~`, endkey: `task~\ufff0`, include_docs: true };
    const result = await this.pouchdb.allDocs(options);
    return result.rows.map(row => row.doc);
  }
}

const prepare = async (rulesEngine, appSettings, pouchdb, pouchdbStateHash, user, state) => {
  await prepareRulesEngine(rulesEngine, appSettings, user, pouchdb.name);
  const { updatedSubjectIds, newPouchdbState } = await syncPouchWithState(pouchdb, pouchdbStateHash, state);
  await rulesEngine.updateEmissionsFor(updatedSubjectIds);
  return newPouchdbState;
};

const prepareRulesEngine = async (rulesEngine, appSettings, user, sessionId) => {
  const rulesSettings = getRulesSettings(appSettings, user, sessionId);
  if (!rulesEngine.isEnabled()) {
    await rulesEngine.initialize(rulesSettings);
  } else {
    // Handle scenarios where the "user" object has changed
    await rulesEngine.rulesConfigChange(rulesSettings);
  }

  /*
  The Date object inside Nools doesn't work with sinon useFakeTimers (closure?)
  So this is a terribly vicious hack to reset that internal component and restart the nools session
  */
  if (RulesEmitter.isEnabled()) {
    RulesEmitter.shutdown();
    RulesEmitter.initialize({
      rules: appSettings.tasks.rules,
      contact: user,
    });
  }
};

const syncPouchWithState = async (pouchdb, pouchdbStateHash, state) => {
  await pouchdb.bulkDocs(ddocs);

  // build a summary of documents in pouchdb
  const newPouchdbState = {};
  const docs = [...state.contacts, ...state.reports];
  for (const doc of docs) {
    const docId = doc._id;
    if (!docId) {
      throw Error(`Doc is missing attribute _id`);
    }
    delete doc._rev; // ignore _rev entirely and permanently

    if (newPouchdbState[docId]) {
      throw Error(`Harness state contains docs with duplicate id ${docId}.`);
    }

    newPouchdbState[docId] = {
      subjectId: getSubjectId(doc),
      docHash: md5(JSON.stringify(doc)),
    };
  }

  // sync added/changed docs to pouchdb
  const updatedSubjects = new Set();
  for (const doc of docs) {
    const docId = doc._id;
    const { docHash, subjectId } = newPouchdbState[docId];
    // new or changed
    if (!pouchdbStateHash[docId] || pouchdbStateHash[docId].docHash !== docHash) {
      await upsert(pouchdb, doc);
      if (subjectId) {
        updatedSubjects.add(subjectId);
      }
    }
  }

  // sync removed docs to pouchdb
  const removedDocIds = Object.keys(pouchdbStateHash).filter(docId => !newPouchdbState[docId]);
  if (removedDocIds.length) {
    const impactedSubjects = removedDocIds.map(docId => pouchdbStateHash[docId].subjectId);
    updatedSubjects.add(...impactedSubjects);

    const deleteDoc = docId => upsert(pouchdb, { _id: docId, _deleted: true });
    await Promise.all(removedDocIds.map(deleteDoc));
  }
  
  return {
    updatedSubjectIds: Array.from(updatedSubjects),
    newPouchdbState,
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
