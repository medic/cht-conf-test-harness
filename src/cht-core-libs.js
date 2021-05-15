const semver = require('semver');

const ChtCoreBundles = require('../dist/all-chts-bundle.dev');

const availableCoreVersions = Object.keys(ChtCoreBundles);

const getFormattedVersion = (version) => {
  if (!version) {
    console.error('Harness configuration file (eg. harness.defaults.json) missing attribute eg: { coreVersion: "3.11.2" }');
    return false;
  }

  if (!semver.valid(version)) {
    throw Error('Harness configuration file (eg. harness.defaults.json) attribute coreVersion must be a valid semver eg: { coreVersion: "3.11.2" }');
  }

  const versionKey = `${semver.major(version)}.${semver.minor(version)}`;
  if (!ChtCoreBundles[versionKey]) {
    throw Error(`cht-core version ${versionKey} is not supported by medic-conf-test-harness. Supported versions are: ${availableCoreVersions}`);
  }

  return versionKey;
};

const getCore = version => {
  const result = ChtCoreBundles[version];
  if (!result) {
    throw Error(`cht-core version ${version} is not supported by medic-conf-test-harness. Supported versions are: ${availableCoreVersions}`);
  }

  return result;
};

module.exports = {
  availableCoreVersions,
  getCore,
  getFormattedVersion,
};