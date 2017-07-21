#!/bin/bash

set -e

# tl;dr npm i -g with current src as tarball

. scripts/tarball.sh

rm -rf .pkg
mkdir .pkg
for f in package* *.js .gitignore LICENSE; do cp $f .pkg; done
ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")
cd .pkg
for f in package*; do sed -r 's|"([a-z-]+)": "file:(.*)"|"\1": "file:../../\2.tar.gz"|g' -i $f; done
ex_re
tar cvfz ./znjs.tar.gz $ex . | sed "s|^|zeronet-js: |g"
npm i ./znjs.tar.gz --production -g
