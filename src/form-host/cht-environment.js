// const $ = require('jquery');
const { useFakeTimers } = require('sinon/lib/sinon/util/fake-timers');
const { toBik_text } = require('bikram-sambat');
const moment = require('moment');

// require('select2');

// // webapp/node_modules/bootstrap/js/dropdown.js expects this declared globally
// window.jQuery = $;
// // webapp/src/js/enketo/main.js expects this for datepicker
// window.$ = $;
// // backward compatibility with harness v2
window.$$ = window.$;

let clock;
window.fakeTimers = (...args) => {
  window.restoreTimers();
  clock = useFakeTimers(...args);
};
window.restoreTimers = () => clock && clock.uninstall();

// window.CHTCore = {};

// require('@cht-core/webapp/src/js/enketo/main.js');

// Enable jQuery support for self-closing xml tags
// https://jquery.com/upgrade-guide/3.5/
// const rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi;
// // eslint-disable-next-line no-import-assign
// Object.defineProperties($, {
//   htmlPrefilter: { value: (html) => html.replace(rxhtmlTag, '<$1></$2>') }
// });

// const xpathExtension = require('@cht-core/webapp/src/js/enketo/medic-xpath-extensions');
// xpathExtension.init({}, toBik_text, moment);
