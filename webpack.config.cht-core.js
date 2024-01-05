const path = require('path');
const WebpackCleanConsolePlugin = require('webpack-clean-console-plugin');
module.exports = env => [
  {
    entry: `./${env.cht}.js`,
    output: {
      path: path.join(__dirname, 'dist', env.cht),
      filename: `cht-core-bundle.dev.js`,
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
  {
    entry: [
      `./build/${env.cht}/build/cht-form/main.js`,
      `./build/${env.cht}/build/cht-form/polyfills.js`,
      `./build/${env.cht}/build/cht-form/runtime.js`,
      `./build/${env.cht}/build/cht-form/scripts.js`,
      `./build/${env.cht}/build/cht-form/styles.css`,
    ],
    output: {
      filename: 'cht-form.js',
      path: path.join(__dirname, 'dist', env.cht),
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
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    optimization: { minimize: false },
  }
];
