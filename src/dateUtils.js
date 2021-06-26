const { DateTime, Duration } = require('luxon');

const toDate = val => {
  let t;
  if (DateTime.isDateTime(val)){
    t = val;
  } else if (typeof val === 'object'){
    if (val instanceof Date && typeof val.getTime() === 'number'){
      t = DateTime.fromJSDate(val);
    } else {
      t = DateTime.fromObject(val);
    }
  }
  if (typeof val === 'number'){
    t = DateTime.fromMillis(val);
  }
  if (typeof val === 'string'){
    const parsedDate = new Date(val);
    if (!isNaN(parsedDate.getTime())){
      t = DateTime.fromJSDate(parsedDate);
    }
  }
  if (t instanceof DateTime && t.isValid){
    return t.toUTC();
  }
  throw 'Unsupported date value';
};

const toDuration = val => {
  let d;
  if (Duration.isDuration(val)){
    d = val;
  } else if (typeof val === 'object'){
    d = Duration.fromObject(val);
  }
  if (typeof val === 'number'){
    d = Duration.fromObject({days: val});
  }
  if (typeof val === 'string'){
    d = Duration.fromISO(val);
  }
  if (d instanceof Duration && d.isValid){
    return d;
  }
  throw 'Unsupported duration value';
};

module.exports = {
  toDate,
  toDuration
};
