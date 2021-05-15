module.exports.pathToProject = undefined;
module.exports = function(c, Utils, Task, Target, emit) {
  const existingCache = Object.keys(require.cache);
  try {
    const tasks = require(`${module.exports.pathToProject}/tasks.js`);
    const targets = require(`${module.exports.pathToProject}/targets.js`);

    const taskEmitter = require(`${module.exports.pathToProject}/node_modules/medic-conf/src/nools/task-emitter`);
    const targetEmitter = require(`${module.exports.pathToProject}/node_modules/medic-conf/src/nools/target-emitter`);

    targetEmitter(targets, c, Utils, Target, emit);
    taskEmitter(tasks, c, Utils, Task, emit);

    emit('_complete', { _id: true });
  } finally {
    const newCache = Object.keys(require.cache).filter(key => !existingCache.includes(key));
    newCache.forEach(key => { 
      console.log(`Bust cache rules: ${key}`);
      delete require.cache[key];
    });
  }
};
