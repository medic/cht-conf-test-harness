const { useFakeTimers } = require('sinon/lib/sinon/util/fake-timers');

let clock;
window.process = undefined;
window.fakeTimers = (...args) => {
  window.restoreTimers();
  clock = useFakeTimers(...args);
};
window.restoreTimers = () => clock && clock.uninstall();
