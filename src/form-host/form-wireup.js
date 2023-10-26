class FormWireup {
  constructor(formHtml, formModel, formXml, userSettingsDoc, contactSummary, formName) {
    const formWrapper = this._getFormWrapper();
    formWrapper.user = userSettingsDoc;
    formWrapper.contactSummary = contactSummary?.context;
    formWrapper.formId = formName;
    formWrapper.formHtml = formHtml;
    formWrapper.formModel = formModel;
    formWrapper.formXml = formXml;
  }

  render(content) {
    return new Promise((resolve) => {
      const formWrapper = this._getFormWrapper();
      formWrapper.addEventListener('onRender', () => resolve());
      formWrapper.content = content;
    });
  }

  async save() {
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
        attributeFilter: ['status'],
      });

      formWrapper.addEventListener('onSubmit', async (e) => {
        observer.disconnect();
        resolve(e.detail);
      });

      $('.enketo .submit').click();
    });
  }

  unload() {
    // Use the cancel button to clear out the form
    $('button.cancel').trigger('click');
  }

  _getFormWrapper() {
    return $('#enketo-wrapper')[0];
  }
}

module.exports = FormWireup;
