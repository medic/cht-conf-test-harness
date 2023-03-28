const hasPermissions = cht.v1.hasPermissions(['can_view_analytics_tab', 'can_verify_reports']);
const hasAnyPermission = cht.v1.hasPermissions(['can_view_analytics_tab', 'can_verify_reports']);

const context = {
  hasPermissions: hasPermissions,
  hasAnyPermission:hasAnyPermission,
};

module.exports = {
  context
};
