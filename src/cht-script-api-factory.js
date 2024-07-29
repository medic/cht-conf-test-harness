/**
 * @module cht-script-api-factory Creates the option `cht.api.v1`
*/

const CoreTargetAggregates = require('./core-target-aggregates');

class ChtScriptApiFactory {
  constructor(core, pouchdb, appSettings) {
    this.core = core;
    this.pouchdb = pouchdb;
    this.appSettings = appSettings;

    this.coreTargetAggregator = new CoreTargetAggregates(core, pouchdb, appSettings);
  }

  async getForRulesEngine(defaultUserRoles) {
    // contact is defined only when using cht api in the contact summary, but should be undefined when calculating rules
    // facility_id is not used when contact is undefined
    return this.getForContactSummary(undefined, undefined, undefined, defaultUserRoles);
  }

  // cht-core/src/ts/services/cht-script-api.service.ts
  async getForContactSummary(contact, userFacilityId, userContactId, defaultUserRoles) {
    const chtScriptApi = this.core.ChtScriptApi;
    if (!chtScriptApi) {
      throw Error('this.core.ChtScriptApi is undefined');
    }

    const defaultChtPermissionSettings = this.appSettings.permissions;
    const result = {
      v1: {
        hasPermissions: (permissions, userRoles = defaultUserRoles, chtPermissionsSettings = defaultChtPermissionSettings) => {
          return chtScriptApi.v1.hasPermissions(permissions, userRoles, chtPermissionsSettings);
        },
        hasAnyPermission: (permissionsGroupList, userRoles = defaultUserRoles, chtPermissionsSettings = defaultChtPermissionSettings) => {
          return chtScriptApi.v1.hasAnyPermission(permissionsGroupList, userRoles, chtPermissionsSettings);
        },
      }
    };

    if (this.core.version === '4.8') {
      result.v1.context = {
        targetDocs: await this.coreTargetAggregator.getTargetDocs(contact, userFacilityId, userContactId),
      };
    }

    return result;
  }
}

module.exports = ChtScriptApiFactory;
