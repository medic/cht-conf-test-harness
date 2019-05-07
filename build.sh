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

npm i
rm -Rf dist
rm -Rf node_modules/enketo-core/node_modules/
patch -f node_modules/enketo-core/src/js/Form.js < node_modules/medic/webapp/patches/enketo-inputs-always-relevant.patch
webpack
cp ext/inbox.css dist

printf "\033[0;32m== BUILD SUCCESSFUL ==\n"