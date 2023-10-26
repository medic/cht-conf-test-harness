// const $ = require('jquery');
// const createFormManager = require('./create-enketo-form-manager');

const getCancelButton = () => $('button.cancel');

class AppFormWireup {
  constructor(formHtml, formModel, formXml, userSettingsDoc, contactSummary, formName) {
    const formWrapper = $('#enketo-wrapper')[0];
    formWrapper.user = userSettingsDoc;
    formWrapper.contactSummary = contactSummary?.context;
    formWrapper.formId = formName;
    formWrapper.formHtml = formHtml;
    formWrapper.formModel = formModel;
    formWrapper.formXml = formXml;
    // this.enketoFormMgr = createFormManager(formHtml, formModel, formXml, userSettingsDoc, contactSummary);
  }

  render(content) {
    return new Promise((resolve) => {
      // console.log(`jkuester - form-host-app.render start`);
      // console.log(JSON.stringify(window.CHTCore));
      const formWrapper = $('#enketo-wrapper')[0];
      formWrapper.addEventListener('onRender', () => {
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
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        if ($('#enketo-wrapper')[0].status.error) {
          observer.disconnect();
          return reject();
        }
      });
      const formWrapper = $('#enketo-wrapper')[0];
      observer.observe(formWrapper, {
        childList: true,
        subtree: true,
        attributes: true,
        // attributeFilter: ['status'],
      });

      formWrapper.addEventListener('onSubmit', async (e) => {
        observer.disconnect();
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
