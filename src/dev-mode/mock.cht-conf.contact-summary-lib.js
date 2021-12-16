/**
 * This is a mocked version of cht-conf's contact-summary lib.js which is an entry-point for cht-conf's compile-app-settings bundle.
 * https://github.com/medic/cht-conf/blob/master/src/contact-summary/lib.js
 *
 * It behaves the same as the production version but can be run inside node require() instead of relying on the resolution aliasing provided by webpack.
 * @module mock.cht-conf.contact-summary-lib
 */
module.exports = (pathToProject, contact, reports, lineage) => {
  const cacheBefore = Object.keys(require.cache);
  try {
    global.contact = contact;
    global.reports = reports;
    global.lineage = lineage;

    const contactSummaryEmitter = require(`${pathToProject}/node_modules/cht-conf/src/contact-summary/contact-summary-emitter`);
    const pathToContactSummary = `${pathToProject}/contact-summary.templated.js`;
    const contactSummary = require(pathToContactSummary);

    return contactSummaryEmitter(contactSummary, contact, reports, lineage);
  }
  finally {
    delete global.contact;
    delete global.reports;
    delete global.lineage;

    const cacheAfter = Object.keys(require.cache).filter(key => !cacheBefore.includes(key));
    cacheAfter.forEach(key => { delete require.cache[key]; });
  }
};
