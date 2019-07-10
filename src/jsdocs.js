  /**
   * @typedef Task An emitted task. The structure of emitted tasks may vary by the version of medic-conf and the version of the medic webapp. In general, tasks have this structure.
   * @property {uuid} _id
   * @property {boolean} deleted
   * @property {Object} doc
   * @property {Object} contact
   * @property {string} icon
   * @property {string} date
   * @property {boolean} resolved
   * @property {string} priority
   * @property {string} priorityLabel
   * @property {Object[]} actions
   */

  /**
   * @typedef Target An emitted target. The structure of emitted targets may vary by the version of medic-conf and the version of the medic webapp. In general, target have this structure.
   * @property {Object} value The aggregated calculation based on the instances.
   * @property {boolean} value.pass
   * @property {number} value.total
   * @property {number} value.percent
   * 
   * @property {Object[]} instances The raw emitted target from Nools.
   * @property {string} instances[x]._id
   * @property {boolean} instances[x].deleted
   * @property {type} instances[x].type
   * @property {boolean} instances[x].pass 
   * @property {string} instances[x].date
   */