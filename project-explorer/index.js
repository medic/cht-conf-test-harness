const $ = require('jquery');

const { content, user, contactSummary } = require('../dist/harness.defaults.json');
const projectAssets = require('../dist/project-assets');
const forms = {
  appForms: Object.keys(projectAssets.appForms),
  contactForms: Object.keys(projectAssets.contactForms),
};

$(() => {
  const renderForm = (type, formName) => `<a class="formLink" href="#" data-type="${type}" data-name="${formName}">${formName}</a>`;
  const appHtml = forms.appForms.map(formName => renderForm('app', formName)).join('');
  const contactHtml = forms.contactForms.map(formName => renderForm('contact', formName)).join('');
  console.log('fileList', projectAssets);

  $('#formList').html(`<p>App</p>
${appHtml}
<p>Contact</p>
${contactHtml}`);

  $('.formLink').click(function() {
    const formType = $(this).attr('data-type');
    const formName = $(this).attr('data-name');

    const useContent = formType === 'contact' ? {} : content;
    const useContactSummary = formType === 'contact' ? undefined : contactSummary;
    const doLoad = () => window.loadXform(formName, projectAssets[`${formType}Forms`][formName], useContent, user, useContactSummary);
    $('#reload').click(doLoad);
    doLoad();
  });

  const defaultForm = window.location.hash.substr(1);
  if (defaultForm) {
    $(`.formLink[data-name="${defaultForm}"]`).click();
  }
});
