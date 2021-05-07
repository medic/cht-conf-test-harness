


process.on('unhandledRejection', err => {
  console.log('unhandledRejection', err);
});

const getInstances = async (rulesEngine) => {
  // TODO: now
  const tasks = await rulesEngine.fetchTasksFor();
  return { tasks, targets: [] };
};

module.exports = getInstances;
