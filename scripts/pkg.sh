#!/bin/bash

if node -v | grep "^v8" > /dev/null; then

  set -e

  rm -rf .pkg
  mkdir .pkg
  for f in package* zeronet.js lib; do cp -r $f .pkg; done
  ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")
  cd .pkg
  for f in package*; do sed -r 's|"([a-z-]+)": "file:(.*)"|"\1": "file:../\2.tar.gz"|g' -i $f; done
  npm i --production
  ../node_modules/.bin/pkg -t node8-linux-x64,node8-macos-x64,node8-win-x64 .
  RUNINCWD=1 TESTOK=1 ./zeronet-linux

else
  echo "Please use node v8+ to build"
fi
