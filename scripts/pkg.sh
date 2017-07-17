#!/bin/bash

if node -v | grep "^v8"; then

  set -ex

  rm -rf .pkg
  mkdir .pkg
  for f in package.json zeronet.js; do cp $f .pkg; done
  ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")
  cd .pkg
  sed -r 's|"([a-z-]+)": "file:(.*)"|"\1": "file:../\2.tar.gz"|g' -i package.json
  npm i --production
  ../node_modules/.bin/pkg -t node8-linux-x64,node8-macos-x64,node8-win-x64 .

else
  echo "Please use node v8+ to build"
fi
