module.exports = [
  {
    id: 'cht.api',
    type: 'count',
    goal: -1,
    appliesTo: 'contacts',
    appliesToType: ['health_center'],
    appliesIf: () => {
      return typeof cht !== 'undefined' ? cht.v1.hasPermissions('chw_permission') : undefined;
    },
    date: 'now'
  }
];
