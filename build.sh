#!/usr/bin/env bash
declare -A cht_versions=(
  ["cht-core-4-11"]="4.11.0"
  ["cht-core-4-18"]="3ab45a2def3921a087c2c902edb9d89bae15ced6"
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

for item in `ls dist | grep -v cht-core`; do
  rm -rf dist/"$item"
done

for version in "${!cht_versions[@]}"; do
  if [[ ! 1 == "$FORCE" ]] && [ -d dist/"$version" ]; then
    printf "\033[0;32m== SKIPPING $version ==\033[0m\n"
    continue
  fi

  printf "\033[0;32m== BUILDING $version ==\033[0m\n"
  rm -rf dist/"$version"

  git clone https://github.com/medic/cht-core.git build/"$version"
  (cd build/"$version" && git reset --hard "${cht_versions[$version]}")
  (cd build/"$version" && git clean -df)

  (cd build/"$version" && npm ci)

  node ./compile-ddocs.js "$version"

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
printf "\033[0;32m== BUILD SUCCESSFUL ==\033[0m\n"
