module.exports.pathToProject = undefined;
module.exports = function(c, Utils, Task, Target, emit) {
  const tasks = require(`${module.exports.pathToProject}/tasks.js`);
  const targets = require(`${module.exports.pathToProject}/targets.js`);

  const taskEmitter = require(`${module.exports.pathToProject}/node_modules/medic-conf/src/nools/task-emitter`);
  const targetEmitter = require(`${module.exports.pathToProject}/node_modules/medic-conf/src/nools/target-emitter`);

  targetEmitter(targets, c, Utils, Target, emit);
  taskEmitter(tasks, c, Utils, Task, emit);

  emit('_complete', { _id: true });
};
