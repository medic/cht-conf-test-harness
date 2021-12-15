module.exports = function (core, options, appSettings) {
  if (!core.ChtScriptApi) {
    console.error('Error: Test Harness :: cannot mock ChtScriptApi. Check if ChtScriptApi is available in the CHT-Core version.');
    return;
  }

  const originalChtScriptApi = core.ChtScriptApi;

  console.warn('mocking~~~~', core, options, appSettings, originalChtScriptApi);

  return {
    v1: {
      hasPermissions: (permissions) => {
        if (!options || !options.user || typeof options.user !== 'object') {
          console.error('Error: Test Harness :: options.user is not an object.');
          return false;
        }

        return ; // originalChtScriptApi.v1.hasPermissions(permissions, options.user.roles, appSettings.permissions);
      },
      hasAnyPermission: (permissions) => {
        if (!options || !options.user || typeof options.user !== 'object') {
          console.error('Error: Test Harness :: options.user is not an object.');
          return false;
        }

        return ; // originalChtScriptApi.v1.hasAnyPermission(permissions, options.user.roles, appSettings.permissions);
      }
    }
  };
};
