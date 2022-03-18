const { DateTime, Duration } = require('luxon');

const toDate = val => {
  let t;
  if (DateTime.isDateTime(val)){
    t = val;
  }
  if (val instanceof Date && typeof val.getTime() === 'number'){
    t = DateTime.fromJSDate(val);
  }
  if (typeof val === 'object' && t === undefined){
    t = DateTime.fromObject(val);
  }
  if (typeof val === 'number'){
    t = DateTime.fromMillis(val);
  }
  if (typeof val === 'string'){
    const parsedDate = parseDateStringIgnoringRFC2822(val);
    if (!isNaN(parsedDate.getTime())){
      t = DateTime.fromJSDate(parsedDate);
    }
  }
  if (DateTime.isDateTime(t) && t.isValid){
    return t.toUTC();
  }
  throw Error('Unsupported date value');
};

const toDuration = val => {
  let d;
  if (Duration.isDuration(val)){
    d = val;
  }
  if (typeof val === 'object' && d === undefined) {
    d = Duration.fromObject(val);
  }
  if (typeof val === 'number'){
    d = Duration.fromObject({days: val});
  }
  if (typeof val === 'string'){
    d = Duration.fromISO(val);
  }
  if (Duration.isDuration(d) && d.isValid){
    return d;
  }
  throw Error('Unsupported duration value');
};

// https://github.com/medic/cht-conf-test-harness/issues/160
const parseDateStringIgnoringRFC2822 = val => {
  const isRFC2822Format = typeof val === 'string' && val.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
  if (isRFC2822Format) {
    const parsedDate = new Date(val);
    const timezoneOffset = parsedDate.getTimezoneOffset() * 60 * 1000;
    return new Date(parsedDate.getTime() + timezoneOffset);
  }

  return new Date(val);
};

module.exports = {
  toDate,
  toDuration
};
