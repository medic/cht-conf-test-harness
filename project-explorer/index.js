const $ = require('jquery');

const { content, user, contactSummary } = require('../dist/harness.defaults.json');
const projectAssets = require('../dist/project-assets');
const fileNames = Object.keys(projectAssets);

$(() => {
  const fileList = fileNames.map(name => `<a class="formLink" href="#" data="${name}">${name}</a>`).join('');
  console.log('fileList', projectAssets);

  const doLoad = formName => window.loadXform(formName, projectAssets[formName], content, user, contactSummary);
  $('#formList').html(fileList);
  $('.formLink').click(function() {
    const formName = $(this).attr('data');
    $('#reload').click(() => doLoad(formName));
    doLoad(formName);
  });

  const defaultForm = window.location.hash.substr(1);
  if (defaultForm) {
    doLoad(defaultForm);
  }
});
