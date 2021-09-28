const { DateTime } = require('luxon');

const { toDate } = require('./dateUtils');

const getDateDifference = (contact, unit) => {
  if (!contact.date_of_birth) {
    return;
  }
  const dob = toDate(contact.date_of_birth).startOf('day');
  return DateTime.now().diff(dob, unit).toObject()[unit];
};

module.exports = {
  ageInDays: contact => getDateDifference(contact, 'days'),
  ageInMonths: contact => getDateDifference(contact, 'months'),
  ageInYears: contact => getDateDifference(contact, 'years'),
};
