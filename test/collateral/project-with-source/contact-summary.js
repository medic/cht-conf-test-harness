const context = {
  hasPermissions: cht.v1.hasPermissions('chw_permission'),
  hasAnyPermission:cht.v1.hasAnyPermission([['chw_permission']])
};

module.exports = {
  context
};
