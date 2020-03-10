const nools = require('nools');
const nootils = require('medic-nootils');
const toDate = require('./toDate');

const FLOW_NAME = 'medic';

const getInstances = async (appSettings, user, contacts, reports, now) => {
  try {
    return doGetInstances(appSettings, user, contacts, reports, now);
  } finally {
    nools.deleteFlow(FLOW_NAME);
  }
};

const calculateNow = input => {
  if (!input) {
    return new Date();
  }

  if (typeof input === 'function') {
    input = input();
  }
  
  if (typeof input === 'object') {
    return input; // is a Date object
  }

  return toDate(input);
};

const doGetInstances = async (appSettings, user, contacts, reports, now) => {
  const Utils = nootils(appSettings);
  Utils.now = () => calculateNow(now);

  // TODO: patch this bug in medic-nootils (<= vs <)
  Utils.isTimely = (date, event) => {
    const due = new Date(date);
    const start = Utils.now();
    start.setDate(start.getDate() + event.start);
    const end = Utils.now();
    end.setDate(end.getDate() - event.end - 1);
    return due.getTime() <= start.getTime() && due.getTime() > end.getTime();
  };

  const compileNools = () => nools.compile(appSettings.tasks.rules, {
    name: FLOW_NAME,
    scope: { Utils, user }
  });

  const flow = nools.getFlow(FLOW_NAME) || compileNools();
  const Contact = flow.getDefined('contact');
  const session = flow.getSession();

  const contactHasId = (contact, id) => contact && (contact._id === id || contact.patient_id === id || contact.place_id === id);
  const getContactId = doc => doc && 
    (doc.patient_id || doc.place_id || 
      (doc.fields && 
        (doc.fields.patient_id || doc.fields.place_id || doc.fields.patient_uuid)
      )
    );

  const contactFacts = contacts.map(contact => new Contact({ contact, reports: [] }));
  for (const report of reports) {
    const associatedContactId = getContactId(report);
    let contact = contactFacts.find(fact => contactHasId(fact.contact, associatedContactId));
    if (!contact) {
      console.warn('Adding report for id without matching contact. Weird stuff can happen.');
      contact = new Contact({ reports: [] });
      contactFacts.push(contact);
    }
    contact.reports.push(report);
  }

  const tasks = [];
  const targets = [];
  session.on('task', fact => tasks.push(fact));
  session.on('target', fact => targets.push(fact));
  contactFacts.forEach(fact => session.assert(fact));
  const err = await session.match();
  if (err) {
    throw new Error(`Unexpected halt: ${err}`);
  }

  return { tasks, targets };
};

module.exports = getInstances;
