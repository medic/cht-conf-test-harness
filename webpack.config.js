const path = require('path');
const WebpackCleanConsolePlugin = require('webpack-clean-console-plugin');


module.exports = [
  {
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
  },

  {
    entry: './all-chts-bundle.js',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'all-chts-bundle.dev.js',
      library: {
        type: 'commonjs',
      }
    },
    resolve: {
      alias: {
        '@medic/calendar-interval': path.join(__dirname, 'node_modules/cht-core-3-14/shared-libs/calendar-interval'),
        '@medic/registration-utils': path.join(__dirname, 'node_modules/cht-core-3-14/shared-libs/registration-utils'),
        '@medic/contact-types-utils': path.join(__dirname, 'node_modules/cht-core-3-14/shared-libs/contact-types-utils'),
      },
    },
    target: 'node',
    mode: 'development',
    devtool: 'source-map',
    plugins: [
      new WebpackCleanConsolePlugin({ include: ['debug'] }),
    ],
  }
];
