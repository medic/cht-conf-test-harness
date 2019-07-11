const $ = require('jquery');

const { content, user, contactSummary } = require('../dist/harness.defaults.json');
const projectAssets = require('../dist/project-assets');
const fileNames = Object.keys(projectAssets);

$(() => {
  const fileList = fileNames.map(name => `<a class="formLink" href="#" data="${name}">${name}</a>`).join('');
  console.log('fileList', projectAssets);

  $('#formList').html(fileList);
  $('.formLink').click(function() {
    const formName = $(this).attr('data');
    const doLoad = () => window.loadXform(formName, projectAssets[formName], content, user, contactSummary);
    $('#reload').click(doLoad);
    doLoad();
  });
});
