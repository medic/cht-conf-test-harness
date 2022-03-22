const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    path: path.join(__dirname, '../dist'),
    filename: 'project-explorer.dev.js',
  },
  resolve: {
    alias: {
      'project-assets': '../dist/project-assets.js',
    }
  },
  module: {
    rules: [
      { test: /\.html$/i, use: 'raw-loader' },
      { test: /\.model$/i, use: 'raw-loader' },
    ],
  },
  mode: 'development'
};
