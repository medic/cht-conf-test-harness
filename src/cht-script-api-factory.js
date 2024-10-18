/**
 * @module cht-script-api-factory 
 * Creates the object `cht.api.v1`
*/

const semver = require('semver');

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
    const datasource = this._getFromDatasource() || this.core.ChtScriptApi;
    if (!datasource) {
      throw Error('DataSource and ChtScriptApi are undefined for this core version');
    }

    const defaultChtPermissionSettings = this.appSettings.permissions;
    const result = {
      v1: {
        hasPermissions: (permissions, userRoles = defaultUserRoles, chtPermissionsSettings = defaultChtPermissionSettings) => {
          return datasource.v1.hasPermissions(permissions, userRoles, chtPermissionsSettings);
        },
        hasAnyPermission: (permissionsGroupList, userRoles = defaultUserRoles, chtPermissionsSettings = defaultChtPermissionSettings) => {
          return datasource.v1.hasAnyPermission(permissionsGroupList, userRoles, chtPermissionsSettings);
        },
      }
    };

    const coreVersion = semver.coerce(this.core.version);
    if (semver.gte(coreVersion, '4.11.0')) {
      const targets = await this.coreTargetAggregator.getTargetDocs(contact, userFacilityId, userContactId);
      result.v1.analytics = {
        getTargetDocs: () => targets,
      };
    }

    return result;
  }
  
  _getFromDatasource() {
    if (!this.core.DataSource) {
      return;
    }
  
    const context = this.core.DataSource.getRemoteDataContext();
    return this.core.DataSource.getDatasource(context);
  }
}

module.exports = ChtScriptApiFactory;
