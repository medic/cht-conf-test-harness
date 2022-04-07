const $ = require('jquery');
require('select2');

const { useFakeTimers } = require('sinon/lib/sinon/util/fake-timers');
const { toBik_text } = require('bikram-sambat');
const moment = require('moment');
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
window.CHTCore = {};

require('../../node_modules/cht-core-4-0/webapp/src/js/enketo/main.js');
const xpathExtension = require('../../node_modules/cht-core-4-0/webapp/src/js/enketo/medic-xpath-extensions');
xpathExtension.init({}, toBik_text, moment);

/* Register a global hook so that new forms can be rendered from Puppeteer */
window.loadAppForm = async (formName, formHtml, formModel, formXml, content, userSettingsDoc, contactSummary) => {
  const wireup = new FormWireup(formHtml, formModel, formXml, userSettingsDoc, contactSummary);
  const form = await wireup.render(content);
  const saveCallback = wireup.save.bind(wireup);
  const formFiller = new FormFiller(formName, saveCallback, form, { verbose: true });

  window.form = form;
  window.formFiller = formFiller;
};

window.loadContactForm = async (formName, formHtml, formModel, formXml, content, userSettingsDoc) => {
  const wireup = new FormWireup(formHtml, formModel, formXml, userSettingsDoc);
  const form = await wireup.renderContactForm(content);
  const saveCallback = wireup.saveContactForm.bind(wireup);
  const formFiller = new FormFiller(formName, saveCallback, form, { verbose: true });

  window.form = form;
  window.formFiller = formFiller;
};
