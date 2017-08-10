#!/bin/bash

if node -v | grep "^v8" > /dev/null; then

  set -e

  op="$PWD"
  t="/tmp/libstdcfix/"
  rm -rf $t
  mkdir -p $t
  cd $t
  wget -qq -O $t/libstdc++6.deb http://archive.ubuntu.com/ubuntu/pool/main/g/gcc-5/libstdc%2B%2B6_5.4.0-6ubuntu1~16.04.4_amd64.deb
  dpkg -x $t/*.deb $t
  p=$(dirname "$(find $t -iname libstdc++.so.6)")
  export LD_LIBRARY_PATH=$p:$LD_LIBRARY_PATH
  cd $op

  rm -rf .pkg
  mkdir .pkg
  for f in package* zeronet.js lib; do cp -r $f .pkg; done
  #ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")
  cd .pkg
  for f in package*; do sed -r 's|"([a-z-]+)": "file:(.*)"|"\1": "file:../\2.tar.gz"|g' -i $f; done
  npm i --production
  v="8.2.1" #Change with every new node version if that version gets available in pkg
  targets="node$v-linux-x64,node$v-macos-x64,node$v-win-x64"
  for t in $(echo "$targets" | sed "s|,| |g"); do
    tt=$(echo "$t" | sed "s|-| |g")
    PKG_REPO=zeit/pkg-fetch ../node_modules/.bin/pkg-fetch $tt f || ../node_modules/.bin/pkg-fetch $tt f
  done
  ../node_modules/.bin/pkg -t $targets .
  RUNINCWD=1 TESTOK=1 ./zeronet-linux && rm -rf .zeronet
else
  echo "Please use node v8+ to build"
fi
