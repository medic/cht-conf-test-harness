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

if [ -d "build/cht-core" ]; then
    (cd build/cht-core && git fetch && git reset --hard origin/7462_forms_module_uplifted-enketo)
else
  git clone -b 7462_forms_module_uplifted-enketo https://github.com/medic/cht-core.git build/cht-core
fi

(cd build/cht-core && npm ci)

node ./compile-ddocs.js

mkdir -p ext/xsl
mkdir -p ext/enketo-transformer/xsl
cp ./build/cht-core/api/src/xsl/openrosa2html5form.xsl ext/xsl
cp ./build/cht-core/api/src/enketo-transformer/xsl/* ext/enketo-transformer/xsl

#dirs=($(find node_modules/cht-* -maxdepth 0 -type d))
#for dir in "${dirs[@]}"; do
dir="build/cht-core"


#  (cd "$dir"/webapp && npm ci --legacy-peer-deps --production)
  (cd "$dir"/api && npm ci --legacy-peer-deps --production)
  (cd "$dir" && patch -f api/src/services/generate-xform.js < ../../patches/generate-xform.patch)

  # 210 patch to disable db-object-widget
  (cd "$dir" && patch -f webapp/src/js/enketo/widgets.js < ../../patches/210-disable-db-object-widgets.patch)
#done

npx webpack

(cd build/cht-core && npm run build-cht-form)

cp build/cht-core/build/cht-form/main.js dist/cht-form_main.js
cp build/cht-core/build/cht-form/polyfills.js dist/cht-form_polyfills.js
cp build/cht-core/build/cht-form/runtime.js dist/cht-form_runtime.js
cp build/cht-core/build/cht-form/scripts.js dist/cht-form_scripts.js
cp build/cht-core/build/cht-form/styles.css dist/cht-form_styles.css
printf "\033[0;32m== BUILD SUCCESSFUL ==\n"
