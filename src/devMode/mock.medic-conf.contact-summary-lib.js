/**
 * @module mock.medic-conf.contact-summary-lib
 * This is a mocked version of medic-conf's contact-summary lib.js which is an entry-point for medic-conf's compile-app-settings bundle.
 * https://github.com/medic/medic-conf/blob/master/src/contact-summary/lib.js
 * 
 * It behaves the same as the production version but can be run inside node require() instead of relying on the resolution aliasing provided by webpack.
 */
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
