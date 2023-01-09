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

npm ci --legacy-peer-deps
rm -Rf dist build
node ./compile-ddocs.js

mkdir -p ext/xsl
mkdir -p ext/enketo-transformer/xsl
cp ./node_modules/cht-core-4-0/api/src/xsl/openrosa2html5form.xsl ext/xsl
cp ./node_modules/cht-core-4-0/api/src/enketo-transformer/xsl/* ext/enketo-transformer/xsl

dirs=($(find node_modules/cht-* -maxdepth 0 -type d))
for dir in "${dirs[@]}"; do
  (cd "$dir"/webapp && npm ci --legacy-peer-deps --production)
  (cd "$dir"/api && npm ci --legacy-peer-deps --production)
  (cd "$dir"/shared-libs/calendar-interval && npm ci --legacy-peer-deps)
  (cd "$dir"/shared-libs/rules-engine && npm ci --legacy-peer-deps)
  (cd "$dir"/shared-libs/phone-number && npm ci --legacy-peer-deps --production)

  # patch the daterangepicker for responsiveness
  # https://github.com/dangrossman/bootstrap-daterangepicker/pull/437
  (cd "$dir" && patch -f webapp/node_modules/bootstrap-daterangepicker/daterangepicker.js < webapp/patches/bootstrap-daterangepicker.patch)

  # patch enketo to always mark the /inputs group as relevant
  (cd "$dir" && patch -f webapp/node_modules/enketo-core/src/js/form.js < webapp/patches/enketo-inputs-always-relevant_form.patch)
  (cd "$dir" && patch -f webapp/node_modules/enketo-core/src/js/relevant.js < webapp/patches/enketo-inputs-always-relevant_relevant.patch)

  # patch enketo to fix repeat name collision bug - this should be removed when upgrading to a new version of enketo-core
  # https://github.com/enketo/enketo-core/issues/815
  (cd "$dir" && patch -f webapp/node_modules/enketo-core/src/js/calculate.js < webapp/patches/enketo-repeat-name-collision.patch)

  # patch messageformat to add a default plural function for languages not yet supported by make-plural #5705
  (cd "$dir" && patch -f webapp/node_modules/messageformat/lib/plurals.js < webapp/patches/messageformat-default-plurals.patch)
done

npx webpack
printf "\033[0;32m== BUILD SUCCESSFUL ==\n"
