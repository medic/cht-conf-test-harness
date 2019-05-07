/* A modification of the TargetGenerator Service */

const _ = require('underscore');
const moment = require('moment');
const toDate = require('./toDate')

const calculateNow = input => {
  if (!input) return new Date();
  if (typeof input === 'function') {
    input = input();
  }
  
  if (typeof input === 'object') return input; // is a Date object
  return toDate(input);
};

const isRelevant = function(instance, nowInput) {
  if (!instance.date) {
    console.warn('Ignoring emitted target with no date - fix your configuration');
    return false;
  }
  if (instance.deleted) {
    return false;
  }

  const now = calculateNow(nowInput);
  const start = moment(now).startOf('month');
  const end = moment(now).endOf('month');
  const instanceDate = moment(instance.date);
  return instanceDate.isSameOrAfter(start) && instanceDate.isSameOrBefore(end);
};

const calculatePercent = function(pass, total) {
  if (total === 0) {
    return 0;
  }
  return Math.round(pass * 100 / total);
};

const calculateValue = function(target) {
  const counts = _.countBy(target.instances, function(instance) {
    return instance.pass ? 'pass' : 'fail';
  });
  _.defaults(counts, { pass: 0, fail: 0 });
  const result = {
    pass: counts.pass,
    total: counts.pass + counts.fail
  };
  if (target.type === 'percent') {
    result.percent = calculatePercent(result.pass, result.total);
  }
  return result;
};

const mergeTarget = function(targets, instance, now) {
  let target = _.findWhere(targets, { id: instance.type });
  if (!target) {
    console.warn(`Unconfigured target instance emitted: ${instance.type}`);
    return;
  }
  if (!target.instances) {
    target.instances = {};
  }

  if (isRelevant(instance, now)) {
    // added or updated - insert into cache
    target.instances[instance._id] = instance;
  } else {
    // deleted or not for this month - remove from the cache
    delete target.instances[instance._id];
  }

  target.value = calculateValue(target);
};

module.exports = mergeTarget;