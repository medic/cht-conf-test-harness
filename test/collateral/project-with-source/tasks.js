const taskRequiringPermission = perm => ({
  name: `cht.api.${perm}`,
  title: `cht.api.${perm}`,
  appliesTo: 'contacts',
  appliesIf: () => {
    return typeof cht !== 'undefined' ? cht.v1.hasPermissions(perm) : undefined;
  },
  actions: [{ form: 'assessment' }],
  events: [{ dueDate: () => Utils.now(), start: 1, end: 1 }],
});

module.exports = [
  taskRequiringPermission('chw_permission'),
  taskRequiringPermission('permission_dne'),
];
