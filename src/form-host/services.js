/*
Fork of https://github.com/medic/cht-core/blob/3.8.x/shared-libs/contact-types-utils/src/index.js
*/
const HARDCODED_TYPES = [
  'district_hospital',
  'health_center',
  'clinic',
  'person'
];
const ContactTypes_isHardcodedType = type => HARDCODED_TYPES.includes(type);

/*
Fork of https://github.com/medic/cht-core/blob/master/webapp/src/js/services/extract-lineage.js
*/
const ExtractLineage = function(contact) {
  if (!contact) {
    return contact;
  }

  const result = { _id: contact._id };
  let minified = result;
  while(contact.parent) {
    minified.parent = { _id: contact.parent._id };
    minified = minified.parent;
    contact = contact.parent;
  }
  return result;
};

module.exports = {
  ExtractLineage,
  ContactTypes_isHardcodedType,
};
