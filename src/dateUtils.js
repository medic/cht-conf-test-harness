const { DateTime, Duration } = require('luxon');

const toDate = val => {
  if (DateTime.isDateTime(val)){
    return val;
  } else if (typeof val === 'number'){
    return DateTime.fromMillis(val);
  } else if (typeof val === 'string'){
    if (val.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)){
      return DateTime.fromISO(val);
    } else if (val.match(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/)){
      return DateTime.fromFormat(val, 'dd/MM/yyyy');
    }
    return DateTime.fromRFC2822(val);
  } else if (typeof val === 'object'){
    if (typeof val.getMonth === 'function'){
      return DateTime.fromJSDate(val);
    }
    return DateTime.fromObject(val);
  }
  throw 'Unsupported date value';
}

const toDuration = val => {
  if (Duration.isDuration(val)){
    return val;
  } else if (typeof val === 'object'){
    return Duration.fromObject(val);
  } else if (typeof val === 'number'){
    return Duration.fromObject({days: val});
  } else {
    return Duration.fromISO(val);
  }
}

const addDate = (start, period) => {
  return toDate(start).plus(toDuration(period));
}

module.exports = {
  addDate,
  toDate,
  toDuration
};
