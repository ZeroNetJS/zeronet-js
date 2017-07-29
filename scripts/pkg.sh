#!/bin/bash

if node -v | grep "^v8" > /dev/null; then

  set -e

  rm -rf .pkg
  mkdir .pkg
  for f in package* zeronet.js lib; do cp -r $f .pkg; done
  #ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")
  cd .pkg
  for f in package*; do sed -r 's|"([a-z-]+)": "file:(.*)"|"\1": "file:../\2.tar.gz"|g' -i $f; done
  npm i --production
  v=$(node -v | sed "s|v||g")
  targets="node$v-linux-x64,node$v-macos-x64,node$v-win-x64"
  for t in $(echo "$targets" | sed "s|,| |g"); do
    tt=$(echo "$t" | sed "s|-| |g")
    ../node_modules/.bin/pkg-fetch $tt || PKG_REPO=zeit/pkg-fetch ../node_modules/.bin/pkg-fetch $tt
  done
  ../node_modules/.bin/pkg -t $targets .
  RUNINCWD=1 TESTOK=1 ./zeronet-linux && rm -rf .zeronet
else
  echo "Please use node v8+ to build"
fi
