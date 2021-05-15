const path = require('path');

const mockContactSummary = require('./mock.medic-conf.contact-summary-lib');
const stubbedNoolsLib = require('./mock.medic-conf.nools-lib');
const devRulesEmitter = require('./mock.rules-engine.rules-emitter');

module.exports = {
  runContactSummary: (appSettingsPath, contact, reports, lineage) => {
    const pathToProject = path.dirname(appSettingsPath);
    return mockContactSummary(pathToProject, contact, reports, lineage);
  },

  mockRulesEngine: (core, appSettingsPath) => {
    const pathToProject = path.dirname(appSettingsPath);

    stubbedNoolsLib.pathToProject = pathToProject;
    if (!core.RulesEmitter.isMock) {
      console.warn('******************************************');
      console.warn('**** medic-conf-test-harness dev mode ****');
      console.warn('******************************************');
      Object.assign(core.RulesEmitter, devRulesEmitter);
    }
  },
};
