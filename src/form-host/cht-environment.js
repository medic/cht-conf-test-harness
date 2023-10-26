const { useFakeTimers } = require('sinon/lib/sinon/util/fake-timers');

// // backward compatibility with harness v2
window.$$ = window.$;

let clock;
window.fakeTimers = (...args) => {
  window.restoreTimers();
  clock = useFakeTimers(...args);
};
window.restoreTimers = () => clock && clock.uninstall();
