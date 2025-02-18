const context = {
  hasPermissions: cht.v1.hasPermissions('chw_permission'),
  hasAnyPermission: cht.v1.hasAnyPermission([['chw_permission']]),
  chtApiAnalyticsTargets: cht.v1.analytics && cht.v1.analytics.getTargetDocs(),
  reportCount: reports?.length,
};

module.exports = {
  context
};
