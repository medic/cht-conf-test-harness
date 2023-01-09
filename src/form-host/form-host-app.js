const $ = require('jquery');
const createFormManager = require('./create-enketo-form-manager');

class AppFormWireup {
  constructor(formHtml, formModel, formXml, userSettingsDoc, contactSummary) {
    this.enketoFormMgr = createFormManager(formHtml, formModel, formXml, userSettingsDoc, contactSummary);
  }

  render(content) {
    const selector = '#enketo-wrapper';
    const formDoc = { _id: 'app-form', title: 'cht-conf-test-harness Application Form' };
    return this.enketoFormMgr.render(selector, formDoc, content);
  }

  async save(formInternalId, form, geoHandle, docId) {
    await this.enketoFormMgr.validate(form);
    $('form.or').trigger('beforesave');
    return await this.enketoFormMgr.save(formInternalId, form, geoHandle, docId);
  }

  transformResult(resultObj) {
    if (!resultObj) {
      return resultObj;
    }

    const [report, ...additionalDocs] = resultObj.result;
    return {
      errors: resultObj.errors,
      section: resultObj.section,
      report,
      additionalDocs,
    };
  }

  unload(form) {
    this.enketoFormMgr.unload(form);
  }
}

module.exports = AppFormWireup;
