
module.exports = {
  '4.0': {
    ddocs: require('./build/cht-core-4-0-ddocs.json'),
    RegistrationUtils: require('cht-core-4-0/shared-libs/registration-utils'),
    CalendarInterval: require('cht-core-4-0/shared-libs/calendar-interval'),
    RulesEngineCore: require('cht-core-4-0/shared-libs/rules-engine'),
    RulesEmitter: require('cht-core-4-0/shared-libs/rules-engine/src/rules-emitter'),
    nootils: require('cht-core-4-0/shared-libs/rules-engine/node_modules/cht-nootils'),
    Lineage: require('cht-core-4-0/shared-libs/lineage'),
    ChtScriptApi: require('cht-core-4-0/shared-libs/cht-script-api'),

    convertFormXmlToXFormModel: require('cht-core-4-0/api/src/services/generate-xform.js').generate,
  },
};
