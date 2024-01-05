const path = require('path');
const WebpackCleanConsolePlugin = require('webpack-clean-console-plugin');

module.exports = [
  {
    entry: './src/form-host/index.js',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: `form-host.dev.js`,
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
        // inside cht-core/api/src/services/generate-xform.js
        '../xsl/xsl-paths': path.join(__dirname, 'ext/xsl-paths.js'), // TODO Support multi cht versions
      },
    },
    target: 'node',
    mode: 'development',
    devtool: 'source-map',
    plugins: [
      new WebpackCleanConsolePlugin({ include: ['debug'] }),
    ],
  },
];
