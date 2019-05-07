const $ = require('jquery');
const FormWireup = require('./wireup');
const FormFiller = require('./form-filler');

const openrosa2html5form = require('medic-enketo-xslt/xsl/openrosa2html5form.xsl');
const openrosa2xmlmodel = require('medic-enketo-xslt/xsl/openrosa2xmlmodel.xsl');

const wireup = new FormWireup(openrosa2html5form, openrosa2xmlmodel);

/* Register a global hook so that new forms can be rendered from PhantomJs */
window.loadXform = async (formName, xform, content, user) => {
  const form = await wireup.render(xform, content, user);
  const formFiller = new FormFiller(formName, form, { verbose: true });

  window.form = form;
  window.formFiller = formFiller;
};

window.$$ = $;
