const fs = require('fs');
const path = require('path');
const Harness = require('..');
const jsonToXml = require('pojo2xml');

const usage = `Usage: build-assets --path=[DIRECTORY]

Builds the content of a project folder for user in project explorer.
  --path         path to the medic project folder
  --output       path where the built assets will be written (optional)
`;

const argv = require('minimist')(process.argv.slice(2));
const pathToProject = path.resolve(argv.path);

if (!pathToProject) {
  console.error(usage);
  return -1;
}

if (!fs.existsSync(pathToProject)) {
  console.error(`Could not locate project folder at: ${path.resolve(pathToProject)}`);
  return -1;
}

(async () => {
  const outputPath = argv['output'] || path.resolve(__dirname, '../dist', 'project-assets.js');
  console.log(`Building assets from project in ${pathToProject}`);

  const harness = new Harness({ directory: pathToProject });
  const harnessDefaultDestinationPath = path.resolve(__dirname, '../dist', 'harness.defaults.json');
  if (fs.existsSync(harnessDefaultDestinationPath)) {
    fs.unlinkSync(harnessDefaultDestinationPath);
  }

  console.log(`Writing ${harnessDefaultDestinationPath}`);
  const fileContent = JSON.stringify({
    user: harness.user,
    content: harness.content,
    contactSummary: {
      id: 'contact-summary',
      xmlStr: jsonToXml({ context: (await harness.getContactSummary()).context }),
    },
  }, null, 2);
  fs.writeFileSync(harnessDefaultDestinationPath, fileContent);

  const appFormPaths = [
    pathToProject,
    path.join(pathToProject, 'forms'),
    path.join(pathToProject, 'forms/app'),
    path.join(pathToProject, 'forms/collect'),
  ];

  const contactFormPaths = [
    path.join(pathToProject, 'forms/contact')
  ];

  const getFilesInFolders = directoriesToScan => {
    const formsInDirectory = [];
    for (const formDirectory of directoriesToScan) {
      if (fs.existsSync(formDirectory)) {
        const filePaths = fs.readdirSync(formDirectory).map(file => path.join(formDirectory, file)).filter(f => f.endsWith('.xml'));
        formsInDirectory.push(...filePaths);
      } else {
        console.warn(`Expected directory of forms does not exist at: ${formDirectory}`);
      }
    }

    return formsInDirectory;
  };

  const appForms = getFilesInFolders(appFormPaths);
  if (appForms.length === 0) {
    console.error(`No xml files found in folders: ${pathToProject}`);
    return -1;
  }

  const windowsEscaping = str => str.replace(/\\/g, '\\\\');
  const formsAsRequirements = formPaths => formPaths
    .map(fullPath => `  '${path.basename(fullPath)}': require('${windowsEscaping(fullPath)}'),`)
    .join('\n');
  fs.writeFileSync(outputPath, `module.exports = {
    appForms: {
    ${formsAsRequirements(appForms)}
    },
    contactForms: {
    ${formsAsRequirements(getFilesInFolders(contactFormPaths))}
    }
  };`);
  console.log(`Compiling to ${outputPath}`);
})();
