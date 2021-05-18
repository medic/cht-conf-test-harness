/*
This code is a slightly altered fork of https://github.com/medic/cht-core/blob/3.8.x/webapp/src/js/services/contact-save.js
*/
const _ = require('lodash/core');
const uuidV4 = require('uuid/v4');

const { contactRecordToJs } = require('./enketo-translation');

const {
  ExtractLineage,
  ContactTypes_isHardcodedType,
} = require('./services');

const CONTACT_FIELD_NAMES = [ 'parent', 'contact' ];

const prepareSubmittedDocsForSave = function(original, submitted) {
  const doc = prepare(submitted.doc);

  return prepareAndAttachSiblingDocs(submitted.doc, original, submitted.siblings)
    .then(function(siblings) {
      const extract = item => {
        item.parent = item.parent && ExtractLineage(item.parent);
        item.contact = item.contact && ExtractLineage(item.contact);
      };

      siblings.forEach(extract);
      extract(doc);

      // This must be done after prepareAndAttachSiblingDocs, as it relies
      // on the doc's parents being attached.
      const repeated = prepareRepeatedDocs(submitted.doc, submitted.repeats);

      return {
        docId: doc._id,
        preparedDocs: [ doc ].concat(repeated, siblings) // NB: order matters: #4200
      };
    });
};

// Prepares document to be bulk-saved at a later time, and for it to be
// referenced by _id by other docs if required.
const prepare = doc => {
  if (!doc._id) {
    doc._id = uuidV4();
  }

  if (!doc._rev) {
    doc.reported_date = Date.now();
  }

  return doc;
};

const prepareRepeatedDocs = (doc, repeated) => {
  const childData = (repeated && repeated.child_data) || [];
  return childData.map(child => {
    child.parent = ExtractLineage(doc);
    return prepare(child);
  });
};

const extractIfRequired = (name, value) => {
  return CONTACT_FIELD_NAMES.includes(name) ? ExtractLineage(value) : value;
};

// Mutates the passed doc to attach prepared siblings, and returns all
// prepared siblings to be persisted.
// This will (on a correctly configured form) attach the full parent to
// doc, and in turn siblings. See internal comments.
const prepareAndAttachSiblingDocs = function(doc, original, siblings) {
  if (!doc._id) {
    throw new Error('doc passed must already be prepared with an _id');
  }

  const preparedSiblings = [];
  const promiseChain = Promise.resolve();

  CONTACT_FIELD_NAMES.forEach(function(fieldName) {
    let value = doc[fieldName];
    if (_.isObject(value)) {
      value = doc[fieldName]._id;
    }
    if (!value) {
      return;
    }
    if (value === 'NEW') {
      const preparedSibling = prepare(siblings[fieldName]);

      // by default all siblings are "person" types but can be overridden
      // by specifying the type and contact_type in the form
      if (!preparedSibling.type) {
        preparedSibling.type = 'person';
      }

      if (preparedSibling.parent === 'PARENT') {
        delete preparedSibling.parent;
        // Cloning to avoid the circular reference we would make:
        //   doc.fieldName.parent.fieldName.parent...
        doc[fieldName] = _.clone(preparedSibling);
        // Because we're assigning the actual doc referencem, the DB().get
        // to attach the full parent to the doc will also attach it here.
        preparedSibling.parent = doc;
      } else {
        doc[fieldName] = extractIfRequired(fieldName, preparedSibling);
      }

      preparedSiblings.push(preparedSibling);
    } else if (original &&
                original[fieldName] &&
                original[fieldName]._id === value) {
      doc[fieldName] = original[fieldName];
    } else {
      // TODO:
      //
      // promiseChain = promiseChain.then(function() {
      //   return DB().get(value).then(function(dbFieldValue) {
      //     // In a correctly configured form one of these will be the
      //     // parent This must happen before we attempt to run
      //     // ExtractLineage on any siblings or repeats, otherwise they
      //     // will extract an incomplete lineage
      //     doc[fieldName] = extractIfRequired(fieldName, dbFieldValue);
      //   });
      // });
    }
  });

  return promiseChain.then(() => preparedSiblings);
};

module.exports = async (form, contactType, now) => {
  const submitted = contactRecordToJs(form.getDataStr({ irrelevant: false }));
  if (ContactTypes_isHardcodedType(contactType)) {
    // default hierarchy - maintain backwards compatibility
    submitted.doc.type = contactType;
  } else {
    // configured hierarchy
    submitted.doc.type = 'contact';
    submitted.doc.contact_type = contactType;
  }
  const preparedDocs = await prepareSubmittedDocsForSave(undefined, submitted);
  preparedDocs.preparedDocs.forEach(doc => doc.reported_date = now ? now.getTime() : Date.now());
  return preparedDocs.preparedDocs;
};
