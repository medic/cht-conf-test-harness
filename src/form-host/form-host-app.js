const FormWireup = require('./form-wireup');

class AppFormWireup extends FormWireup {
  constructor(formHtml, formModel, formXml, userSettingsDoc, contactSummary, formName) {
    super(formHtml, formModel, formXml, userSettingsDoc, contactSummary, formName);
  }

  transformResult(resultObj) {
    if (!resultObj) {
      return resultObj;
    }

    const [report, ...additionalDocs] = resultObj.result;
    return {
      errors: resultObj.errors,
      section: resultObj.section,
      report,
      additionalDocs,
    };
  }
}

module.exports = AppFormWireup;
