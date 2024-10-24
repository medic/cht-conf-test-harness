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

  async getForContactSummary(contact, userFacilityId, userContactId, defaultUserRoles) {
    const context = this.core.DataSource.getRemoteDataContext();
    const datasource = this.core.DataSource.getDatasource(context);
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

    const userFacilityIds = [userFacilityId];
    const targets = await this.coreTargetAggregator.getTargetDocs(contact, userFacilityIds, userContactId);
    result.v1.analytics = {
      getTargetDocs: () => targets,
    };

    return result;
  }
}

module.exports = ChtScriptApiFactory;
