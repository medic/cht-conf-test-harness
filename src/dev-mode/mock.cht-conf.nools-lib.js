/**
 * This is a mocked version of cht-conf's nools lib.js which is an entry-point for cht-conf's compile-app-settings bundle.
 * https://github.com/medic/cht-conf/blob/master/src/nools/lib.js
 *
 * It behaves the same as the production version but can be run inside node require() instead of relying on the resolution aliasing provided by webpack.
 * @module mock.cht-conf.nools-lib
 */
module.exports.pathToProject = undefined;
module.exports = function(c, user, Utils, chtScriptApi, Task, Target, emit) {
  const cacheBefore = Object.keys(require.cache);
  try {
    global.Utils = Utils;
    global.user = user;
    global.cht = chtScriptApi;

    const tasks = require(`${module.exports.pathToProject}/tasks.js`);
    const targets = require(`${module.exports.pathToProject}/targets.js`);

    const taskEmitter = require(`${module.exports.pathToProject}/node_modules/cht-conf/src/nools/task-emitter`);
    const targetEmitter = require(`${module.exports.pathToProject}/node_modules/cht-conf/src/nools/target-emitter`);

    targetEmitter(targets, c, Utils, Target, emit);
    taskEmitter(tasks, c, Utils, Task, emit);

    emit('_complete', { _id: true });
  } finally {
    delete global.Utils;
    delete global.user;
    delete global.cht;

    const cacheAfter = Object.keys(require.cache).filter(key => !cacheBefore.includes(key));
    cacheAfter.forEach(key => { delete require.cache[key]; });
  }
};
