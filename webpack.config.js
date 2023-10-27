const path = require('path');
const WebpackCleanConsolePlugin = require('webpack-clean-console-plugin');

const coreVersions = ['cht-core-4-0'];

const formHostConfig = (chtCoreTag) => {
  return {
    entry: './src/form-host/index.js',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: `form-host-${chtCoreTag}.dev.js`,
    },
    mode: 'development'
  };
};

module.exports = [
  ...coreVersions.map(formHostConfig),
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
        '../xsl/xsl-paths': path.join(__dirname, 'ext/xsl-paths.js'),

        '@medic/contact-types-utils': path.join(__dirname, 'build/cht-core/shared-libs/contact-types-utils'),
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
