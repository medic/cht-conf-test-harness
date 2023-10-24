// const $ = require('jquery');
// const createFormManager = require('./create-enketo-form-manager');

const getCancelButton = () => $('button.cancel');

class AppFormWireup {
  constructor(formHtml, formModel, formXml, userSettingsDoc, contactSummary) {
    const formWrapper = $('#enketo-wrapper')[0];
    formWrapper.formHtml = formHtml;
    formWrapper.formModel = formModel;
    formWrapper.formXml = formXml;
    formWrapper.user = userSettingsDoc;
    formWrapper.contactSummary = contactSummary;
    // this.enketoFormMgr = createFormManager(formHtml, formModel, formXml, userSettingsDoc, contactSummary);
  }

  render(content) {
    return new Promise((resolve) => {
      // console.log(`jkuester - form-host-app.render start`);
      // console.log(JSON.stringify(window.CHTCore));
      const formWrapper = $('#enketo-wrapper')[0];
      formWrapper.addEventListener('onRender', (e) => {
        console.log(`jkuester - form-host-app.render onRender`);
        resolve();
      });
      formWrapper.content = content;
    });

    // formWrapper.formId = null;
    // const selector = '#enketo-wrapper';
    // const formDoc = { _id: 'app-form', title: 'cht-conf-test-harness Application Form' };
    // return this.enketoFormMgr.render(selector, formDoc, content);
  }

  async save(formInternalId, form, geoHandle, docId) {
    const formWrapper = $('#enketo-wrapper')[0];
    return new Promise((resolve, reject) => {
      formWrapper.addEventListener('onSubmit', async (e) => {
        resolve(e.detail);
      });
      $('.enketo .submit').click();
    });



    // await this.enketoFormMgr.validate(form);
    // $('form.or').trigger('beforesave');
    // return await this.enketoFormMgr.save(formInternalId, form, geoHandle, docId);
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

  unload() {
    // Use the cancel button to clear out the form (if it has not been already cleared)
    getCancelButton().trigger('click');
  }
}

module.exports = AppFormWireup;
