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
const taskEvent = ({
  name: `task-with-events-name`,
  title: `task-with-events-title`,
  appliesTo: 'reports',
  appliesToType: ['assessment'],
  appliesIf: (c, r) => {
    this.reported = r.reported_date;
    return !!r;
  },
  actions: [{ form: 'follow_up' }],
  events: [1, 2, 3, 5, 12, 19, 26, 33, 40, 47]
    .map(days => ({
      id: `followup+${days}`,
      start: 1,
      end: 3,
      dueDate: function () {
        
        return Utils.addDate(this.reported, days) ;
      },
    })),
});

module.exports = [
  taskRequiringPermission('chw_permission'),
  taskRequiringPermission('permission_dne'),
  taskEvent
];
