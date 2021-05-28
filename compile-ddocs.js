const compile = require('couchdb-compile');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('build')) {
  fs.mkdirSync('build');
}

const coreVersions = fs.readdirSync('node_modules')
  .filter(dir => dir.startsWith('cht-core-'));

for (const coreVersion of coreVersions) {
  const outputPath = path.resolve(`./build/${coreVersion}-ddocs.json`);
  const ddocFolderPath = [
    `node_modules/${coreVersion}/ddocs/medic-client/`,
    `node_modules/${coreVersion}/ddocs/medic-db/medic-client/`,
  ].find(fs.existsSync);
  console.log(`Compiling ddocs for ${coreVersion} to ${outputPath}`);
  compile(ddocFolderPath, function(error, doc) {
    if (error) {
      console.error(error);
      throw error;
    }

    fs.writeFileSync(outputPath, JSON.stringify([doc], null, 2));
    console.log(`ddocs compiled to ${outputPath}`);
  });
}
