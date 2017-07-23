#!/bin/bash

set -e

# tl;dr npm i -g with current src as tarball

#inst="$npm_config_prefix"
#[ -z "$inst" ] && inst="/usr"
#inst="$inst/lib/node_modules"

rm -rf .pkg
mkdir .pkg
for f in package* zeronet.js lib npm-shrinkwrap.json .gitignore LICENSE; do cp -r $f .pkg; done
ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")
cd .pkg
for f in package* npm-shrinkwrap.json; do sed -r 's|"([a-z-]+)": "file:(.*)"|"\1": "file:\2.tar.gz"|g' -i $f; done
mv ../*.tar.gz .
#tar cvfz ../znjs.tar.gz --mode="777" . | sed "s|^|zeronet-js: |g"
#mv ../znjs.tar.gz .
npm i . --unsafe-perm --production -g
