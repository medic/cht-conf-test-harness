const $ = require('jquery');

const { content, user, contactSummary } = require('../dist/harness.defaults.json');
const projectAssets = require('../dist/project-assets');
const forms = {
  appForms: Object.keys(projectAssets.appFormHtml),
  contactForms: Object.keys(projectAssets.contactFormHtml),
};

$(() => {
  const generateLinkToOpenForm = (type, formName) => `<a class="formLink" href="#" data-type="${type}" data-name="${formName}">${formName}</a>`;
  const htmlLinksToAppForms = forms.appForms.map(formName => generateLinkToOpenForm('app', formName)).join('');
  const htmlLinksToContactForms = forms.contactForms.map(formName => generateLinkToOpenForm('contact', formName)).join('');
  console.log('fileList', projectAssets);

  $('#formList').html(`<p>App</p>
${htmlLinksToAppForms}
<p>Contact</p>
${htmlLinksToContactForms}`);

  $('.formLink').click(function() {
    const formType = $(this).attr('data-type');
    const formName = $(this).attr('data-name');

    const useContent = formType === 'contact' ? {} : content;
    const useContactSummary = formType === 'contact' ? undefined : contactSummary;
    const loadFunction = formType === 'contact' ? window.loadContactForm : window.loadAppForm;
    const doLoad = () => loadFunction(
      formName,
      projectAssets[`${formType}FormHtml`][formName],
      projectAssets[`${formType}FormModel`][formName],
      useContent,
      user,
      useContactSummary
    );

    $('#reload').click(doLoad);
    doLoad();
  });

  const defaultForm = window.location.hash.substr(1);
  if (defaultForm) {
    $(`.formLink[data-name="${defaultForm}"]`).click();
  }
});
