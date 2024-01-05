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

for item in `ls build | grep -v cht-core`; do
    rm -rf $item
done

declare -a versions=("cht-core-4-6")
# TODO Eventually we should filter this based on which artifacts already exist
for version in "${versions[@]}"; do
  if [ -d build/"$version" ]; then
    (cd build/"$version" && git fetch && git reset --hard origin/master)
  else
    git clone -b master https://github.com/medic/cht-core.git build/"$version"
  fi

  (cd build/"$version" && npm ci)

  node ./compile-ddocs.js "$version"

  (cd build/"$version"/api && npm ci --legacy-peer-deps --production)
  (cd build/"$version" && patch -f api/src/services/generate-xform.js < ../../patches/generate-xform.patch)
  # 210 patch to disable db-object-widget
  (cd build/"$version" && patch -f webapp/src/js/enketo/widgets.js < ../../patches/210-disable-db-object-widgets.patch)
  (cd build/"$version" && npm run build-cht-form)
done

# TODO update this to split out xsl by cht version
mkdir -p ext/xsl
mkdir -p ext/enketo-transformer/xsl
cp ./build/cht-core-4-6/api/src/xsl/openrosa2html5form.xsl ext/xsl
cp ./build/cht-core-4-6/api/src/enketo-transformer/xsl/* ext/enketo-transformer/xsl

npx webpack

printf "\033[0;32m== BUILD SUCCESSFUL ==\n"
