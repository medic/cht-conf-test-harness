require('./cht-environment');

const FormWireupApp = require('./form-host-app');
const FormWireupContact = require('./form-host-contact');
const FormFiller = require('./form-filler');

/* Register global hook so new forms can be rendered from Puppeteer */
window.loadForm = (formName, formType, formHtml, formModel, formXml, content, userSettingsDoc, contactSummary) => {
  const wireupType = formType === 'contact' ? FormWireupContact : FormWireupApp;
  return loadForm(wireupType, formName, formHtml, formModel, formXml, content, userSettingsDoc, contactSummary);
};

const loadForm = async (FormWireup, formName, formHtml, formModel, formXml, content, userSettingsDoc, contactSummary) => {
  const wireup = new FormWireup(formHtml, formModel, formXml, userSettingsDoc, contactSummary, formName);
  const form = await wireup.render(content);
  const formFiller = new FormFiller({ verbose: true });

  // window.form = form;
  window.formFiller = formFiller;

  const untransformedFillAndSave = async (multipageAnswer) => {
    const { isComplete, errors } = await formFiller.fillForm(multipageAnswer);
    if (!isComplete) {
      return {
        errors,
        section: 'general',
        result: [],
      };
    }

    try {
      return {
        errors: [],
        section: 'general',
        result: await wireup.save(),
      };
    }
    catch (e) {
      return { 
        errors: [
          ...await formFiller.getVisibleValidationErrors(),
          // TODO Should consider actually not adding this extra error if the form submission error is a validation error
          {
            type: 'save',
            msg: `Failed to save app form: ${e}`,
          }
        ],
        section: 'general',
        result: [],
      };
    }
  };

  window.fillAndSave = async multipageAnswer => wireup.transformResult(await untransformedFillAndSave(multipageAnswer));
  window.unload = () => wireup.unload();
};
