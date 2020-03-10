const path = require('path');

module.exports = {
  entry: './src/form-host/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'form-host.dev.js',
  },
  resolve: {
    alias: {
      'openrosa-xpath-extensions': path.join(__dirname, 'node_modules/openrosa-xpath-evaluator/src/openrosa-xpath-extensions'),
      'extended-xpath': path.join(__dirname, 'node_modules/openrosa-xpath-evaluator/src/extended-xpath'),
      './xpath-evaluator-binding': path.join(__dirname, 'ext/OpenrosaXpathEvaluatorBinding'),
    }
  },
  module: {
    rules: [
      { test: /\.xsl$/i, use: 'raw-loader' },
      { test: /\.xml$/i, use: 'raw-loader' },
    ],
  },
  mode: 'development'
};
