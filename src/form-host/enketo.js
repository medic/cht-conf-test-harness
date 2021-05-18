/*
This code is a slightly altered fork of https://github.com/medic/cht-core/blob/3.8.x/webapp/src/js/services/enketo.js
*/
const $ = require('jquery');
const uuid = require('uuid/v4');

const { reportRecordToJs } = require('./enketo-translation');

const getRecordForForm = (form, formXml, formName, now) => {
  $('form.or').trigger('beforesave');

  const record = form.getDataStr({ irrelevant: false });
  const doc = {
    form: formName,
    type: 'data_record',
    content_type: 'xml',
    reported_date: now ? now.getTime() : Date.now(),
    // contact: ExtractLineage(contact),
    // from: contact && contact.phone,
  };

  return xmlToDocs(doc, formXml, record, now);
};

const xmlToDocs = function(doc, formXml, record, now) {
  function mapOrAssignId(e, id) {
    if (!id) {
      const $id = $(e).children('_id');
      if ($id.length) {
        id = $id.text();
      }
      if (!id) {
        id = uuid();
      }
    }
    e._couchId = id;
  }

  function getId(xpath) {
    return recordDoc
      .evaluate(xpath, recordDoc, null, window.XPathResult.ANY_TYPE, null)
      .iterateNext()
      ._couchId;
  }

  // Chrome 30 doesn't support $xml.outerHTML: #3880
  function getOuterHTML(xml) {
    if (xml.outerHTML) {
      return xml.outerHTML;
    }
    return $('<temproot>').append($(xml).clone()).html();
  }

  const recordDoc = $.parseXML(record);
  const $record = $($(recordDoc).children()[0]);
  mapOrAssignId($record[0], doc._id || uuid());

  $record.find('[db-doc]')
    .filter(function() {
      return $(this).attr('db-doc').toLowerCase() === 'true';
    })
    .each(function() {
      mapOrAssignId(this);
    });

  $record.find('[db-doc-ref]').each(function() {
    const $ref = $(this);
    const refId = getId($ref.attr('db-doc-ref'));
    $ref.text(refId);
  });

  const docsToStore = $record.find('[db-doc=true]').map(function() {
    const docToStore = reportRecordToJs(getOuterHTML(this));
    // docToStore._id = getId(xpathPath(this));
    docToStore.reported_date = now ? now.getTime() : Date.now();
    return docToStore;
  }).get();

  doc._id = getId('/*');
  // doc.hidden_fields = getHiddenFieldList(record);

  // const attach = function(elem, file, type, alreadyEncoded, xpath) {
  //   xpath = xpath || xpathPath(elem);
  //   // replace instance root element node name with form internal ID
  //   const filename = 'user-file' +
  //                  (xpath.startsWith('/' + doc.form) ? xpath : xpath.replace(/^\/[^/]+/, '/' + doc.form));
  //   AddAttachment(doc, filename, file, type, alreadyEncoded);
  // };

  // $record.find('[type=file]').each(function() {
  //   const xpath = xpathPath(this);
  //   const $input = $('input[type=file][name="' + xpath + '"]');
  //   const file = $input[0].files[0];
  //   if (file) {
  //     attach(this, file, file.type, false, xpath);
  //   }
  // });

  // $record.find('[type=binary]').each(function() {
  //   const file = $(this).text();
  //   if (file) {
  //     $(this).text('');
  //     attach(this, file, 'image/png', true);
  //   }
  // });

  record = getOuterHTML($record[0]);

  // AddAttachment(doc, GetReportContent.REPORT_ATTACHMENT_NAME, record, 'application/xml');

  docsToStore.unshift(doc);
  doc.fields = reportRecordToJs(record, formXml);
  return docsToStore;
};

module.exports = getRecordForForm;
