// TODO: When project code can use moment, replace this with moment

const toDate = val => {
  let parsedDate = new Date(val);
  if (isNaN(parsedDate.getTime())) return undefined;

  /*
  Most date formats are interpretted as local time, but this specific date form is UTC
  new Date('2000-01-02').getDate() west of UTC returns 1 and east of UTC returns 2
  This code adjusts new Date() to ignore this
  */
  const isIsoInput = typeof val === 'string' && val.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
  if (isIsoInput) {
    const timezoneOffset = parsedDate.getTimezoneOffset() * 60 * 1000;
    parsedDate = new Date(parsedDate.getTime() + timezoneOffset);
  }

  return parsedDate;
};

module.exports = toDate;
