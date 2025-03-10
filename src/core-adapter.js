/**
 * @module core-adapter
*/

const _ = require('lodash');
const md5 = require('md5');
const PouchDB = require('pouchdb');
const semver = require('semver');
const uuid = require('uuid/v4');

PouchDB.plugin(require('pouchdb-adapter-memory'));

const ChtScriptApiFactory = require('./cht-script-api-factory');
const { getMonthStartDate } = require('./dateUtils');

class CoreAdapter {
  constructor(core, appSettings) {
    this.appSettings = appSettings;
    this.pouchdb = new PouchDB(`cht-conf-test-harness-${uuid()}`, { adapter: 'memory' });
    this.core = core;
    this.rulesEngine = core.RulesEngineCore(this.pouchdb);
    this.pouchdbStateHash = {};
    this.lineageLib = core.Lineage(Promise, this.pouchdb);

    this.chtScriptApiFactory = new ChtScriptApiFactory(core, this.pouchdb, appSettings);
  }

  async fetchTargets(user, userRoles, state) {
    this.pouchdbStateHash = await prepare(this.core, this.rulesEngine, this.appSettings, this.pouchdb, this.pouchdbStateHash, this.chtScriptApiFactory, user, userRoles, state);

    const uhcMonthStartDate = getMonthStartDate(this.appSettings);
    const relevantInterval = this.core.CalendarInterval.getCurrent(uhcMonthStartDate);
    return this.rulesEngine.fetchTargets(relevantInterval);
  }

  async fetchTasksFor(user, userRoles, state) {
    this.pouchdbStateHash = await prepare(this.core, this.rulesEngine, this.appSettings, this.pouchdb, this.pouchdbStateHash, this.chtScriptApiFactory, user, userRoles, state);
    return this.rulesEngine.fetchTasksFor();
  }

  async fetchTaskDocs() {
    const options = { startkey: `task~`, endkey: `task~\ufff0`, include_docs: true };
    const result = await this.pouchdb.allDocs(options);
    return result.rows.map(row => row.doc);
  }

  async fetchHydratedDoc(id, state) {
    const { updatedSubjectIds, newPouchdbState } = await syncPouchWithState(this.core, this.pouchdb, this.pouchdbStateHash, state);
    if (this.rulesEngine.isEnabled()) {
      await this.rulesEngine.updateEmissionsFor(updatedSubjectIds);
    }
    this.pouchdbStateHash = newPouchdbState;

    try {
      return await this.lineageLib.fetchHydratedDoc(id);
    } catch (err) {
      throw Error(`fetchHydratedDoc failed for id:${id} error: ${err}`);
    }
  }

  async buildLineage(id, state) {
    const { updatedSubjectIds, newPouchdbState } = await syncPouchWithState(this.core, this.pouchdb, this.pouchdbStateHash, state);
    if (this.rulesEngine.isEnabled()) {
      await this.rulesEngine.updateEmissionsFor(updatedSubjectIds);
    }
    this.pouchdbStateHash = newPouchdbState;

    const lineage = await this.lineageLib.fetchLineageById(id);
    const contactDocs = await this.lineageLib.fetchContacts(lineage);
    await this.lineageLib.fillContactsInDocs(lineage, contactDocs);
    lineage.shift();
    return lineage;
  }

  getReportsForContactSummary(contact, reports, contactId, state) {
    if (Array.isArray(reports)) {
      return [...reports];
    }

    const contactDocs = [contact, ...state.contacts];
    const relevantContactDocs = contactDocs.filter(contact => {
      const isSelf = contact?._id === contactId;
      const isChild = contact?.parent?._id === contactId;
      return isSelf || (isChild && this.core.ContactTypesUtils.isPerson(this.appSettings, contact));
    });
    const subjectIds = _.flatten(relevantContactDocs.map(contact => this.core.RegistrationUtils.getSubjectIds(contact)));

    const reportHasMatchingSubject = report => subjectIds.includes(this.core.RegistrationUtils.getSubjectId(report));
    return state.reports.filter(reportHasMatchingSubject);
  }

  minify(doc) {
    return this.lineageLib.minify(doc);
  }

  async chtScriptApi(contact, userFacilityId, userContactId, userRoles) {
    return await this.chtScriptApiFactory.getForContactSummary(contact, userFacilityId, userContactId, userRoles);
  }
}

const prepare = async (chtCore, rulesEngine, appSettings, pouchdb, pouchdbStateHash, chtScriptApiFactory, user, userRoles, state) => {
  await prepareRulesEngine(chtCore, rulesEngine, appSettings, chtScriptApiFactory, user, userRoles, pouchdb.name);
  const { updatedSubjectIds, newPouchdbState } = await syncPouchWithState(chtCore, pouchdb, pouchdbStateHash, state);
  await rulesEngine.updateEmissionsFor(updatedSubjectIds);
  return newPouchdbState;
};

const prepareRulesEngine = async (chtCore, rulesEngine, appSettings, chtScriptApiFactory, user, userRoles, sessionId) => {
  const rulesSettings = await getRulesSettings(chtCore, appSettings, chtScriptApiFactory, user, userRoles, sessionId);

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
  if (chtCore.RulesEmitter.isEnabled()) {
    chtCore.RulesEmitter.shutdown();
    chtCore.RulesEmitter.initialize(rulesSettings);
  }
};

const syncPouchWithState = async (chtCore, pouchdb, pouchdbStateHash, state) => {
  await pouchdb.bulkDocs(chtCore.ddocs);

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

    const subjectIds = chtCore.RegistrationUtils.getSubjectIds(doc);
    newPouchdbState[docId] = {
      subjectId: subjectIds && subjectIds[0],
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

  // sync documents that were deleted into pouchdb
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

const getRulesSettings = async (chtCore, settingsDoc, chtScriptApiFactory, userContactDoc, userRoles, sessionId) => {
  const settingsTasks = settingsDoc?.tasks || {};
  // https://github.com/medic/cht-conf-test-harness/issues/106
  // const filterTargetByContext = (target) => target.context ? !!this.parseProvider.parse(target.context)({ user: userContactDoc }) : true;
  const targets = settingsTasks.targets?.items || [];
  const rules = getRules(chtCore.version, settingsTasks);

  const chtScriptApi = await chtScriptApiFactory.getForRulesEngine(userRoles);
  return {
    ...rules,
    taskSchedules: settingsTasks.schedules,
    targets: targets,
    enableTasks: true,
    enableTargets: true,
    contact: userContactDoc, // <- this goes to rules emitter
    user: {
      _id: `org.couchdb.user:${userContactDoc ? userContactDoc._id : 'default'}`,
      roles: userRoles,
    },
    monthStartDate: getMonthStartDate(settingsDoc),
    sessionId,
    chtScriptApi,
  };
};

const getRules = (coreVersion, settingsTasks) => {
  const addNoolsBoilerplateToCode = code => `define Target { _id: null, contact: null, deleted: null, type: null, pass: null, date: null, groupBy: null }
define Contact { contact: null, reports: null, tasks: null }
define Task {
  _id: null, deleted: null, doc: null, contact: null, icon: null, date: null, readyStart: null, readyEnd: null, 
  title: null, fields: null, resolved: null, priority: null, priorityLabel: null, reports: null, actions: null
}
rule GenerateEvents {
  when { c: Contact } then { ${code} }
}`;

  // rules mutation added in cht-conf 3.19.0
  const actualCoreVersion = semver.coerce(coreVersion);
  const addNoolsBoilerplate = settingsTasks.isDeclarative && semver.lt(actualCoreVersion, '4.2.0-dev');
  const rules = addNoolsBoilerplate ? addNoolsBoilerplateToCode(settingsTasks.rules) : settingsTasks.rules;
  // do not set the isDeclarative flag when the code has nools boilerplate
  const rulesAreDeclarative = !addNoolsBoilerplate && settingsTasks.isDeclarative;
  return { rules, rulesAreDeclarative };
};

module.exports = CoreAdapter;
