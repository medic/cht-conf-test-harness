/**
 * @module dev-rules-emitter
 */
const nootils = require('medic-nootils');
const RegistrationUtils = require('cht-core-3-11/shared-libs/registration-utils');

const StubbedNoolsLib = require('./stubbed-medic-conf-nools-lib');

let enabled = false;
let Utils;
let user;

module.exports = {
  /**
  * Initializes the rules emitter
  *
  * @param {Object} settings Settings for the behavior of the rules emitter
  * @param {Object} settings.rules Rules code from settings doc
  * @param {Object[]} settings.taskSchedules Task schedules from settings doc
  * @param {Object} settings.contact The logged in user's contact document
  * @returns {Boolean} Success
  */
  initialize: (settings) => {
    if (!settings.rules) {
      return false;
    }

    enabled = true;

    const settingsDoc = { tasks: { schedules: settings.taskSchedules } };
    Utils = nootils(settingsDoc);
    user = settings.contact;

    return true;
  },

  isLatestNoolsSchema: () => true,
  isEnabled: () => !!enabled,
  shutdown: () => { enabled = false; },

  /**
  * Runs the partner's rules code for a set of documents and returns all emissions from nools
  *
  * @param {Object[]} contactDocs A set of contact documents
  * @param {Object[]} reportDocs All of the contacts' reports
  * @param {Object[]} taskDocs All of the contacts' task documents (must be linked by requester to a contact)
  *
  * @returns {Promise<Object>} emissions The raw emissions from nools
  * @returns {Object[]} emissions.tasks Array of task emissions
  * @returns {Object[]} emissions.targets Array of target emissions
  */
  getEmissionsFor: (contactDocs, reportDocs = [], taskDocs = []) => {
    if (!Array.isArray(contactDocs)) {
      throw Error('invalid argument: contactDocs is expected to be an array');
    }

    if (!Array.isArray(reportDocs)) {
      throw Error('invalid argument: reportDocs is expected to be an array');
    }

    if (!Array.isArray(taskDocs)) {
      throw Error('invalid argument: taskDocs is expected to be an array');
    }

    const facts = marshalDocsIntoNoolsFacts(contactDocs, reportDocs, taskDocs);
    const Task = class { constructor(x) { Object.assign(this, x); }};
    const Target = class { constructor(x) { Object.assign(this, x); }};
    const results = { tasks: [], targets: [] };
    const emitCallback = (instanceType, instance) => {
      if (instanceType === 'task') {
        results.tasks.push(instance);
      } else if (instanceType === 'target') {
        results.targets.push(instance);
      }
    };
       
    for (const fact of facts) {
      global.Utils = Utils;
      global.user = user;
      StubbedNoolsLib(fact, Utils, Task, Target, emitCallback);
    }

    return Promise.resolve(results);
  },
};

const marshalDocsIntoNoolsFacts = (contactDocs, reportDocs, taskDocs) => {
  const factByContactId = contactDocs.reduce((agg, contact) => {
    agg[contact._id] = { contact, reports: [], tasks: [] };
    return agg;
  }, {});

  const factBySubjectId = contactDocs.reduce((agg, contactDoc) => {
    const subjectIds = RegistrationUtils.getSubjectIds(contactDoc);
    for (const subjectId of subjectIds) {
      if (!agg[subjectId]) {
        agg[subjectId] = factByContactId[contactDoc._id];
      }
    }
    return agg;
  }, {});

  const addHeadlessContact = (contactId) => {
    const contact = contactId ? { _id: contactId } : undefined;
    const newFact = { contact, reports: [], tasks: [] };
    factByContactId[contactId] = factBySubjectId[contactId] = newFact;
    return newFact;
  };

  for (const report of reportDocs) {
    const subjectIdInReport = RegistrationUtils.getSubjectId(report);
    const factOfPatient = factBySubjectId[subjectIdInReport] || addHeadlessContact(subjectIdInReport);
    factOfPatient.reports.push(report);
  }

  for (const task of taskDocs) {
    const sourceId = task.requester;
    const factOfPatient = factBySubjectId[sourceId] || addHeadlessContact(sourceId);
    factOfPatient.tasks.push(task);
  }

  return Object.keys(factByContactId).map(key => {
    factByContactId[key].reports = factByContactId[key].reports.sort((a, b) => a.reported_date - b.reported_date);
    return factByContactId[key];
  }); // Object.values(factByContactId)
};
