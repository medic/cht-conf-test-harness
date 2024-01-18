#!/usr/bin/env bash
declare -A cht_versions=(
  ["cht-core-4-6"]="42807deaae818bf2085d0457f9f161073493aec1" # TODO update this to point to 4.6 tag
)

exit_on_error() {
  exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    printf "\033[0;31m== BUILD FAILED. Exit code $? ==\n"
    exit $exit_code
  fi
}

set -e
trap exit_on_error EXIT

if [ "$1" == "--force" ]; then
  FORCE=1
fi

npm ci --legacy-peer-deps
rm -Rf build

if [[ 1 == "$FORCE" ]]; then
  rm -Rf dist
else
  for item in `ls dist | grep -v cht-core`; do
    rm -rf dist/"$item"
  done
fi

for version in "${!cht_versions[@]}"; do
  if [[ ! 1 == "$FORCE" ]] && [ -d dist/"$version" ]; then
    printf "\033[0;32m== SKIPPING $version ==\n"
    continue
  fi

  git clone https://github.com/medic/cht-core.git build/"$version"
  (cd build/"$version" && git reset --hard "${cht_versions[$version]}")
  (cd build/"$version" && git clean -df)

  (cd build/"$version" && npm ci)

  node ./compile-ddocs.js "$version"

  (cd build/"$version"/api && npm ci --legacy-peer-deps --production)
  (cd build/"$version" && patch -f api/src/services/generate-xform.js < ../../patches/generate-xform.patch)
  # 210 patch to disable db-object-widget
  (cd build/"$version" && patch -f webapp/src/js/enketo/widgets.js < ../../patches/210-disable-db-object-widgets.patch)
  (cd build/"$version" && npm run build-cht-form)

  mkdir -p dist/"$version"/xsl
  mkdir -p dist/"$version"/enketo-transformer/xsl
  cp ./build/"$version"/api/src/xsl/openrosa2html5form.xsl dist/"$version"/xsl
  cp ./build/"$version"/api/src/enketo-transformer/xsl/* dist/"$version"/enketo-transformer/xsl

  npx webpack --config cht-bundles/webpack.config.cht-core.js --env.cht="$version"
done

npx webpack
printf "\033[0;32m== BUILD SUCCESSFUL ==\n"
