const $ = require('jquery');
const { useFakeTimers } = require('sinon/lib/sinon/util/fake-timers');
const { toBik_text } = require('bikram-sambat');
const moment = require('moment');

require('select2');

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
