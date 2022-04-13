const $ = require('jquery');
const createFormManager = require('./create-enketo-form-manager');

class ContactFormWireup {
  constructor(formHtml, formModel, formXml, userSettingsDoc, contactSummary) {
    this.enketoFormMgr = createFormManager(formHtml, formModel, formXml, userSettingsDoc, contactSummary);
  }

  render(content) {
    const selector = '#enketo-wrapper';
    const formContext = {
      selector,
      formDoc: { _id: 'whatever', title: 'form name ABC 987' },
      instanceData: content,
    };
    return this.enketoFormMgr.renderContactForm(formContext);
  }

  async save(formInternalId, form, geoHandle, docId) {
    await this.enketoFormMgr.validate(form);
    return (await this.enketoFormMgr.saveContactForm(form, docId, formInternalId)).preparedDocs;
  }

  transformResult(resultObj) {
    if (!resultObj) return resultObj;
    
    return {
      errors: resultObj.errors,
      section: resultObj.section,
      contacts: resultObj.result || [],
    };
  }

  unload(form) {
    this.enketoFormMgr.unload(form);
  }
}

module.exports = ContactFormWireup;
