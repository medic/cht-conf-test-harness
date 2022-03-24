const path = require('path');

module.exports = [
  {
    entry: './src/form-host/index.js',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'form-host.dev.js',
    },
    resolve: {
      alias: {
        'enketo/config': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'src/js/enketo/config.js'),
        'enketo/widgets': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'src/js/enketo/widgets'),
        'enketo/xpath-evaluator-binding': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'src/js/enketo/OpenrosaXpathEvaluatorBinding'),
        'enketo/file-manager': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'src/js/enketo/file-manager'),
        'enketo/translator': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'src/js/enketo/translator'),
        './repeat': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'src/js/enketo/repeat'),
        'extended-xpath': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/openrosa-xpath-evaluator/src/extended-xpath'),
        'openrosa-extensions': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/openrosa-xpath-evaluator/src/openrosa-extensions'),
        // enketo currently duplicates bootstrap's dropdown code.  working to resolve this upstream
        // https://github.com/enketo/enketo-core/issues/454
        '../../js/dropdown.jquery': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/bootstrap/js/dropdown'),
        'bikram-sambat': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/bikram-sambat'),
        'messageformat': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/messageformat/index'),
        'lodash/core': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/lodash/core'),
        'lodash/uniqBy': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/lodash/uniqBy'),
        'lodash/flatten': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/lodash/flatten'),
        'lodash/intersection': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/lodash/intersection'),
        'lodash/partial': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/lodash/partial'),
        'lodash/uniq': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'node_modules/lodash/uniq'),
        
        // enketo geopicker widget css requires these two images as backgrounds
        // they don't exist in the enketo source and the styles are commented out in the latest version
        // https://github.com/enketo/enketo-core/blob/master/src/widget/geo/geopicker.scss#L1119
        // the builder throws an error if the paths are not resolved
        '../../../build/images/layers.png': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'src/img/layers.png'),
        '../../../build/images/layers-2x.png': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/', 'src/img/layers.png'),
        
        // Exclude the node-forge dependency from the bundle. This breaks the `digest` xForm function from
        // openrosa-xpath-evaluator, but keeping it in adds 72.51KB to the bundle size.
        // https://github.com/medic/cht-core/issues/7324
        'node-forge': false,

        // Only include the jquery version from the package.json (and not any different versions pulled in transitively).
        // Once https://github.com/select2/select2/issues/5993 is resolved, we should try to coalesce back on one version
        // of jquery and remove this alias.
        'jquery': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/node_modules/jquery'),
        'select2': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/node_modules/select2'),
        '@medic/enketo-form-manager': path.join(__dirname, 'node_modules/cht-core-4-0/webapp/src/js/enketo/enketo-form-manager.js'),
        '@medic/phone-number': path.join(__dirname, 'node_modules/cht-core-4-0/shared-libs/phone-number'),
        '@medic-xpath-extensions': path.join(__dirname, 'node_modules/cht-core-4-0/', 'webapp/src/js/enketo/medic-xpath-extensions'),
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
        '@medic/calendar-interval': path.join(__dirname, 'node_modules/cht-core-4-0/shared-libs/calendar-interval'),
        '@medic/registration-utils': path.join(__dirname, 'node_modules/cht-core-4-0/shared-libs/registration-utils'),
        '@medic/contact-types-utils': path.join(__dirname, 'node_modules/cht-core-4-0/shared-libs/contact-types-utils'),
      },
    },
    target: 'node',
    mode: 'development',
    devtool: 'source-map'
  }
];
