
module.exports = {
  '3.8': {
    ddocs: require('./build/cht-core-3-8-ddocs.json'),
    RegistrationUtils: require('cht-core-3-8/shared-libs/registration-utils'),
    CalendarInterval: require('cht-core-3-8/shared-libs/calendar-interval'),
    RulesEngineCore: require('cht-core-3-8/shared-libs/rules-engine'),
    RulesEmitter: require('cht-core-3-8/shared-libs/rules-engine/src/rules-emitter'),
    nootils: require('cht-core-3-8/shared-libs/rules-engine/node_modules/medic-nootils'),
  },
  '3.9': {
    ddocs: require('./build/cht-core-3-9-ddocs.json'),
    RegistrationUtils: require('cht-core-3-9/shared-libs/registration-utils'),
    CalendarInterval: require('cht-core-3-9/shared-libs/calendar-interval'),
    RulesEngineCore: require('cht-core-3-9/shared-libs/rules-engine'),
    RulesEmitter: require('cht-core-3-9/shared-libs/rules-engine/src/rules-emitter'),
    nootils: require('cht-core-3-9/shared-libs/rules-engine/node_modules/medic-nootils'),
  },
  '3.10': {
    ddocs: require('./build/cht-core-3-10-ddocs.json'),
    RegistrationUtils: require('cht-core-3-10/shared-libs/registration-utils'),
    CalendarInterval: require('cht-core-3-10/shared-libs/calendar-interval'),
    RulesEngineCore: require('cht-core-3-10/shared-libs/rules-engine'),
    RulesEmitter: require('cht-core-3-10/shared-libs/rules-engine/src/rules-emitter'),
    nootils: require('cht-core-3-9/shared-libs/rules-engine/node_modules/medic-nootils'),
  },
  '3.11': {
    ddocs: require('./build/cht-core-3-11-ddocs.json'),
    RegistrationUtils: require('cht-core-3-11/shared-libs/registration-utils'),
    CalendarInterval: require('cht-core-3-11/shared-libs/calendar-interval'),
    RulesEngineCore: require('cht-core-3-11/shared-libs/rules-engine'),
    RulesEmitter: require('cht-core-3-11/shared-libs/rules-engine/src/rules-emitter'),
    nootils: require('cht-core-3-9/shared-libs/rules-engine/node_modules/medic-nootils'),
  },
};
