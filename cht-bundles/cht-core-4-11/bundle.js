module.exports = {
  ddocs: require('../../build/cht-core-4-11-ddocs.json'),
  RegistrationUtils: require('../../build/cht-core-4-11/shared-libs/registration-utils'),
  CalendarInterval: require('../../build/cht-core-4-11/shared-libs/calendar-interval'),
  RulesEngineCore: require('../../build/cht-core-4-11/shared-libs/rules-engine'),
  ContactTypesUtils: require('../../build/cht-core-4-11/shared-libs/contact-types-utils'),
  RulesEmitter: require('../../build/cht-core-4-11/shared-libs/rules-engine/src/rules-emitter'),
  nootils: require('../../build/cht-core-4-11/node_modules/cht-nootils'),
  Lineage: require('../../build/cht-core-4-11/shared-libs/lineage'),
  convertFormXmlToXFormModel: require('../../build/cht-core-4-11/api/src/services/generate-xform.js').generate,
};
