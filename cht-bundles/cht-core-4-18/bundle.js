module.exports = {
  ddocs: require('../../build/cht-core-4-18-ddocs.json'),
  RegistrationUtils: require('../../build/cht-core-4-18/shared-libs/registration-utils'),
  CalendarInterval: require('../../build/cht-core-4-18/shared-libs/calendar-interval'),
  RulesEngineCore: require('../../build/cht-core-4-18/shared-libs/rules-engine'),
  ContactTypesUtils: require('../../build/cht-core-4-18/shared-libs/contact-types-utils'),
  RulesEmitter: require('../../build/cht-core-4-18/shared-libs/rules-engine/src/rules-emitter'),
  nootils: require('../../build/cht-core-4-18/node_modules/cht-nootils'),
  Lineage: require('../../build/cht-core-4-18/shared-libs/lineage'),
  DataSource: require('../../build/cht-core-4-18/shared-libs/cht-datasource'),
  convertFormXmlToXFormModel: require('../../build/cht-core-4-18/api/src/services/generate-xform.js').generate,
};
