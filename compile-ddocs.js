const compile = require('couchdb-compile');
const fs = require('fs');
const path = require('path');

const outputPath = path.resolve('./dist/core-ddocs.json');

compile('node_modules/cht-core-3-11/ddocs/medic-db/medic-client/', function(error, doc) {
  if (error) {
    throw error;
  }

  fs.writeFileSync(outputPath, JSON.stringify([doc], null, 2));
  console.log(`ddocs compiled to ${outputPath}`);
});
