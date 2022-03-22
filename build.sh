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
node ./compile-ddocs.js

dirs=($(find node_modules/cht-* -maxdepth 0 -type d))
for dir in "${dirs[@]}"; do
  (cd "$dir"/webapp && npm ci --production)
  (cd "$dir"/api && npm ci --production)
  (cd "$dir"/shared-libs/rules-engine && npm ci --production)
  (cd "$dir"/shared-libs/enketo-form-manager && npm ci --production)
  (cd "$dir" && patch -f webapp/node_modules/enketo-core/src/js/calculate.js < webapp/patches/enketo-repeat-name-collision.patch)
done

npx webpack
cp ext/inbox.css dist

printf "\033[0;32m== BUILD SUCCESSFUL ==\n"