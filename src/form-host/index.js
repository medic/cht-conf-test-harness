const $ = require('jquery');
require('select2');

const { useFakeTimers } = require('sinon/lib/sinon/util/fake-timers');
const FormWireup = require('./wireup');
const FormFiller = require('./form-filler');

window.$$ = $;

// webapp/node_modules/bootstrap/js/dropdown.js expects this declared globally
window.jQuery = $;
// webapp/src/js/enketo/main.js expects this for datepicker
window.$ = $;

let clock;
window.fakeTimers = (...args) => {
  window.restoreTimers();
  clock = useFakeTimers(...args);
};

window.restoreTimers = () => clock && clock.uninstall();

// shared-libs/enketo-form-manager/src/enketo-form-manager.js writes into this object
window.CHTCore = {
  Select2Search: {
    init: () => Promise.resolve(),
  },
  Translate: { // TODO: Same as on interface to FormDataServices
    get: x => Promise.resolve(x),
    instant: x => x,
  },
  AndroidAppLauncher: {
    isEnabled: () => false,
  },
  Language: { // TODO: Same as on interface to FormDataServices
    get: () => Promise.resolve('en'),
  },
  MRDT: {
    enabled: () => false,
  },
  Settings: { // TODO: Used by phone-lib
    get: () => Promise.resolve({
      default_country_code: '1'
    })
  }
};

require('../../node_modules/cht-core-4-0/webapp/src/js/enketo/main.js');

/* Register a global hook so that new forms can be rendered from PhantomJs */
window.loadXform = async (formName, formHtml, formModel, formXml, content, userSettingsDoc, contactSummary) => {
  const wireup = new FormWireup(formHtml, formModel, formXml, userSettingsDoc, contactSummary);
  const form = await wireup.render(content);
  const saveCallback = wireup.save.bind(wireup);
  const formFiller = new FormFiller(formName, saveCallback, form, { verbose: true });

  window.form = form;
  window.formFiller = formFiller;
};
