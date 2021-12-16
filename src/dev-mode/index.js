const path = require('path');

const mockContactSummary = require('./mock.cht-conf.contact-summary-lib');
const stubbedNoolsLib = require('./mock.cht-conf.nools-lib');
const devRulesEmitter = require('./mock.rules-engine.rules-emitter');
const stubChtScriptApi = require('./mock.cht-script-api');

const warnDevModeIsRunning = () => {
  console.warn('******************************************');
  console.warn('**** medic-conf-test-harness dev mode ****');
  console.warn('******************************************');
};

module.exports = {
  runContactSummary: (appSettingsPath, contact, reports, lineage) => {
    const pathToProject = path.dirname(appSettingsPath);
    return mockContactSummary(pathToProject, contact, reports, lineage);
  },

  mockRulesEngine: (core, appSettingsPath) => {
    const pathToProject = path.dirname(appSettingsPath);

    stubbedNoolsLib.pathToProject = pathToProject;
    if (!core.RulesEmitter.isMock) {
      warnDevModeIsRunning();
      Object.assign(core.RulesEmitter, devRulesEmitter(core));
    }
  },

  mockChtScriptApi: (core, options, appSettings) => {
    if (core.ChtScriptApi.isMock) {
      return;
    }

    warnDevModeIsRunning();
    const stubbedChtScriptApi = stubChtScriptApi(core, options, appSettings);

    if (!stubbedChtScriptApi) {
      return;
    }

    const v1 = Object.assign({}, core.ChtScriptApi.v1, stubbedChtScriptApi.v1);
    Object.assign(core.ChtScriptApi, { v1, isMock: true });
  }
};
