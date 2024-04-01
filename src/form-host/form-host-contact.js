const FormWireup = require('./form-wireup');

class ContactFormWireup extends FormWireup {
  constructor(formHtml, formModel, formXml, userSettingsDoc, contactSummary, contactType) {
    super(formHtml, formModel, formXml, userSettingsDoc, contactSummary, contactType);
    this._getFormWrapper().contactType = contactType;
  }

  transformResult(resultObj) {
    if (!resultObj) {
      return resultObj;
    }
    
    return {
      errors: resultObj.errors,
      section: resultObj.section,
      contacts: resultObj.result || [],
    };
  }
}

module.exports = ContactFormWireup;
