const fs = require('fs');
const path = require('path');

const pathToProject = path.resolve(__dirname, '/home/kenn/projects/muso/harness/test/collateral');
const outputPath = path.resolve(__dirname, '../dist', 'project-assets.js');
console.log(`Building assets from project in ${pathToProject}`);

const formDirectory = path.join(pathToProject);
const formsInDirectory = fs.readdirSync(formDirectory).filter(f => f.endsWith('.xml'));
const data = formsInDirectory
  .map(filename => path.join(formDirectory, filename))
  .map(fullPath => `  '${path.basename(fullPath)}': require('${fullPath}'),`)
  .join('\n');
fs.writeFileSync(outputPath, `module.exports = {
  ${data}
};`);
console.log(`Compiling to ${outputPath}`);
