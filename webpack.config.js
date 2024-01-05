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
  {
    entry: [
      "./build/cht-core/build/cht-form/main.js",
      "./build/cht-core/build/cht-form/polyfills.js",
      "./build/cht-core/build/cht-form/runtime.js",
      "./build/cht-core/build/cht-form/scripts.js",
      "./build/cht-core/build/cht-form/styles.css",
    ],
    output: {
      filename: 'index.js',
      path: path.join(__dirname, 'dist', 'cht-form'),
      assetModuleFilename: '[name][ext]'
    },
    resolve: {
      alias: {
        '/fonts/NotoSans-Regular.ttf': './fonts/NotoSans-Regular.ttf',
        '/fonts/NotoSans-Bold.ttf': './fonts/NotoSans-Bold.ttf',
        '/fonts/enketo-icons-v2.woff': './fonts/enketo-icons-v2.woff',
        '/fonts/enketo-icons-v2.ttf': './fonts/enketo-icons-v2.ttf',
        '/fonts/enketo-icons-v2.svg': './fonts/enketo-icons-v2.svg',
      },
    },
    module: {
      rules: [
        {
          test: /\.(svg|ttf|woff)$/i,
          type: 'asset/resource'
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    optimization: { minimize: false },
  }
];
