#!/usr/bin/env bash
exit_on_error() {
  exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    printf "\033[0;31m== BUILD FAILED. Exit code $? ==\n"
    exit $exit_code
  fi
}

set -e
trap exit_on_error EXIT

npm ci
rm -Rf dist build
rm -Rf node_modules/enketo-core/node_modules/
patch -f node_modules/enketo-core/src/js/Form.js < node_modules/cht-core-3-11/webapp/patches/enketo-inputs-always-relevant.patch
node ./compile-ddocs.js

pushd . && cd node_modules/cht-core-3-8/shared-libs/rules-engine && npm ci && popd
pushd . && cd node_modules/cht-core-3-9/shared-libs/rules-engine && npm ci && popd
pushd . && cd node_modules/cht-core-3-11/shared-libs/rules-engine && npm ci && popd

npx webpack
cp ext/inbox.css dist

printf "\033[0;32m== BUILD SUCCESSFUL ==\n"