const $ = require('jquery');
const FormWireup = require('./wireup');
const FormFiller = require('./form-filler');

window.$$ = $;

// webapp/node_modules/bootstrap/js/dropdown.js expects this declared globally
window.jQuery = $;

// shared-libs/enketo-form-manager/src/enketo-form-manager.js writes into this object
window.CHTCore = {
  Select2Search: {
    init: () => Promise.resolve(),
  },
  Language: { // TODO: Same as on interface to FormDataServices
    get: () => Promise.resolve('en'),
  },
};

const formWireup = new FormWireup();
require('../../node_modules/cht-core-4-0/webapp/src/js/enketo/main.js');

/* Register a global hook so that new forms can be rendered from PhantomJs */
window.loadXform = async (formName, formHtml, formModel, content, user, contactSummary) => {
  const instanceData = {
    content,
    user,
    contact: { _id: 'subject_123' }, // TODO: How get this?
    contactSummary,
  };

  const form = await formWireup.render(formHtml, formModel, instanceData);
  const formFiller = new FormFiller(formName, form, formHtml, { verbose: true });

  window.form = form;
  window.formFiller = formFiller;
};
