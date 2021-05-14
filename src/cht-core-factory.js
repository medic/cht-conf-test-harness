const semver = require('semver');

const ChtCore = require('../dist/all-chts-bundle.dev');

const availableCoreVersions = Object.keys(ChtCore);

const getVersion = (appSettings) => {
  const version = appSettings.core_version;
  if (!version) {
    throw Error('app_settings.json requires attribute eg: { core_version: "3.11.2" }');
  }

  if (!semver.valid(version)) {
    throw Error('app_settings.json attribute core_version must be a valid semver eg: { core_version: "3.11.2" }');
  }

  const versionKey = `${semver.major(version)}.${semver.minor(version)}`;
  if (!ChtCore[versionKey]) {
    throw Error(`cht-core version ${versionKey} is not supported by medic-conf-test-harness. Supported versions are: ${availableCoreVersions}`);
  }

  return versionKey;
};

const getCore = version => {
  const result = ChtCore[version];
  if (!result) {
    throw Error(`cht-core version ${version} is not supported by medic-conf-test-harness. Supported versions are: ${availableCoreVersions}`);
  }

  return result;
};

module.exports = {
  availableCoreVersions,
  getCore,
  getVersion,
};
