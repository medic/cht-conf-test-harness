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
patch -f node_modules/enketo-core/src/js/Form.js < node_modules/cht-core-3-13/webapp/patches/enketo-inputs-always-relevant.patch
patch -f node_modules/enketo-core/src/js/page.js < patches/enketo-handle-no-active-pages.patch
node ./compile-ddocs.js

dirs=($(find node_modules/cht-* -maxdepth 0 -type d))
for dir in "${dirs[@]}"; do
  (cd "$dir"/shared-libs/rules-engine && npm ci --production)
done

npx webpack
cp ext/inbox.css dist

printf "\033[0;32m== BUILD SUCCESSFUL ==\n"