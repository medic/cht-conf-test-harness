const path = require('path');

module.exports = {
  FORM_STYLESHEET: path.join(__dirname, '../ext/xsl/openrosa2html5form.xsl'),
  MODEL_STYLESHEET: path.join(__dirname, '../ext/enketo-transformer/xsl/openrosa2xmlmodel.xsl'),
};
