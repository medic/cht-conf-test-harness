/**
 * This is a mocked version of medic-conf's nools lib.js which is an entry-point for medic-conf's compile-app-settings bundle.
 * https://github.com/medic/medic-conf/blob/master/src/nools/lib.js
 * 
 * It behaves the same as the production version but can be run inside node require() instead of relying on the resolution aliasing provided by webpack.
 * @module mock.medic-conf.nools-lib
 */
module.exports.pathToProject = undefined;
module.exports = function(c, user, Utils, Task, Target, emit) {
  const cacheBefore = Object.keys(require.cache);
  try {
    global.Utils = Utils;
    global.user = user;

    const tasks = require(`${module.exports.pathToProject}/tasks.js`);
    const targets = require(`${module.exports.pathToProject}/targets.js`);

    const taskEmitter = require(`${module.exports.pathToProject}/node_modules/medic-conf/src/nools/task-emitter`);
    const targetEmitter = require(`${module.exports.pathToProject}/node_modules/medic-conf/src/nools/target-emitter`);

    targetEmitter(targets, c, Utils, Target, emit);
    taskEmitter(tasks, c, Utils, Task, emit);

    emit('_complete', { _id: true });
  } finally {
    delete global.Utils;
    delete global.user;

    const cacheAfter = Object.keys(require.cache).filter(key => !cacheBefore.includes(key));
    cacheAfter.forEach(key => { delete require.cache[key]; });
  }
};
