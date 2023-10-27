
module.exports = {
  '4.0': {
    ddocs: require('./build/cht-core-4-0-ddocs.json'),
    RegistrationUtils: require('./build/cht-core/shared-libs/registration-utils'),
    CalendarInterval: require('./build/cht-core/shared-libs/calendar-interval'),
    RulesEngineCore: require('./build/cht-core/shared-libs/rules-engine'),
    RulesEmitter: require('./build/cht-core/shared-libs/rules-engine/src/rules-emitter'),
    nootils: require('./build/cht-core/node_modules/cht-nootils'),
    Lineage: require('./build/cht-core/shared-libs/lineage'),
    ChtScriptApi: require('./build/cht-core/shared-libs/cht-script-api'),

    convertFormXmlToXFormModel: require('./build/cht-core/api/src/services/generate-xform.js').generate,
  },
};
