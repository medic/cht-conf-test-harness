// const createFormManager = require('./create-enketo-form-manager');

const getCancelButton = () => $('button.cancel');

class ContactFormWireup {
  constructor(formHtml, formModel, formXml, userSettingsDoc, contactSummary, contactType) {
    const formWrapper = $('#enketo-wrapper')[0];
    formWrapper.user = userSettingsDoc;
    formWrapper.contactSummary = contactSummary?.context;
    formWrapper.contactType = contactType;
    formWrapper.formHtml = formHtml;
    formWrapper.formModel = formModel;
    formWrapper.formXml = formXml;
    // this.enketoFormMgr = createFormManager(formHtml, formModel, formXml, userSettingsDoc, contactSummary);
  }

  render(content) {
    return new Promise((resolve) => {
      console.log(`jkuester - form-host-app.render start`);
      // console.log(JSON.stringify(window.CHTCore));
      const formWrapper = $('#enketo-wrapper')[0];
      formWrapper.addEventListener('onRender', () => {
        console.log(`jkuester - form-host-app.render onRender`);
        resolve();
      });
      formWrapper.content = content;
    });
    // const selector = '#enketo-wrapper';
    // const formContext = {
    //   selector,
    //   formDoc: { _id: 'contact-form', title: 'cht-conf-test-harness Contact Form' },
    //   instanceData: content,
    // };
    // return this.enketoFormMgr.renderContactForm(formContext);
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
        // attributeFilter: ['status'], // TODO Make this more efficient
      });


      formWrapper.addEventListener('onSubmit', async (e) => {
        observer.disconnect();
        resolve(e.detail);
      });
      $('.enketo .submit').click();
    });
    // await this.enketoFormMgr.validate(form);
    // return (await this.enketoFormMgr.saveContactForm(form, docId, formInternalId)).preparedDocs;
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

  unload() {
    // Use the cancel button to clear out the form (if it has not been already cleared)
    getCancelButton().trigger('click');
  }
}

module.exports = ContactFormWireup;
