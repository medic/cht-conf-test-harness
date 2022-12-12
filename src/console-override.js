/*
 * Adapted from: https://github.com/bahmutov/capture-logs-example/blob/master/log.js
 */
const _ = require('lodash');
const methodNames = ['log', 'info', 'debug'];

class ConsoleOverride {
  constructor(options) {
    this.originalConsole = {};
    this.options = _.defaults(options, { verbose: true });
  }

  start() {
    const self = this;
    methodNames.forEach(methodName => {
      const originalMethod = (this.originalConsole[methodName] = console[methodName]);

      console[methodName] = function () {
        if (self.options.verbose) {
          originalMethod.apply(console, arguments);
        }
      };
    });
  }

  stop() {
    Object.keys(this.originalConsole).forEach(methodName => {
      console[methodName] = this.originalConsole[methodName];
    });
  }
}

module.exports = ConsoleOverride;
