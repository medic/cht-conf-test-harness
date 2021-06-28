const semver = require('semver');

const ChtCoreBundles = require('../dist/all-chts-bundle.dev');

const availableCoreVersions = Object.keys(ChtCoreBundles);

const get = version => {
  if (!version) {
    console.error('Harness configuration file (eg. harness.defaults.json) missing attribute eg: { coreVersion: "3.11.2" }');
    return false;
  }

  version = semver.coerce(version);
  if (!semver.valid(version)) {
    throw Error(`Harness configuration file (eg. harness.defaults.json) attribute coreVersion:"${version}" must be a valid semver eg: { coreVersion: "3.11.2" }`);
  }

  const versionKey = `${semver.major(version)}.${semver.minor(version)}`;
  const result = ChtCoreBundles[versionKey];
  if (!result) {
    throw Error(`cht-core version ${versionKey} is not supported by cht-conf-test-harness. Supported versions are: ${availableCoreVersions}`);
  }

  return result;
};

module.exports = {
  availableCoreVersions,
  get,
};
