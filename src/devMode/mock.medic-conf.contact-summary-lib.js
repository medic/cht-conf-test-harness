module.exports = (pathToProject, contact, reports, lineage) => {
  const contactSummaryEmitter = require(`${pathToProject}/node_modules/medic-conf/src/contact-summary/contact-summary-emitter`);

  global.contact = contact;
  global.reports = reports;
  global.lineage = lineage;
  
  const pathToContactSummary = `${pathToProject}/contact-summary.templated.js`;
  const contactSummary = require(pathToContactSummary);
  
  try {
    return contactSummaryEmitter(contactSummary, contact, reports, lineage);
  }
  finally {
    delete global.contact;
    delete global.reports;
    delete global.lineage;
  }
};
