module.exports = {
  ddocs: require('../../build/cht-core-4-5-ddocs.json'),
  RegistrationUtils: require('../../build/cht-core-4-5/shared-libs/registration-utils'),
  CalendarInterval: require('../../build/cht-core-4-5/shared-libs/calendar-interval'),
  RulesEngineCore: require('../../build/cht-core-4-5/shared-libs/rules-engine'),
  RulesEmitter: require('../../build/cht-core-4-5/shared-libs/rules-engine/src/rules-emitter'),
  nootils: require('../../build/cht-core-4-5/node_modules/cht-nootils'),
  Lineage: require('../../build/cht-core-4-5/shared-libs/lineage'),
  ChtScriptApi: require('../../build/cht-core-4-5/shared-libs/cht-script-api'),
  convertFormXmlToXFormModel: require('../../build/cht-core-4-5/api/src/services/generate-xform.js').generate,
};
