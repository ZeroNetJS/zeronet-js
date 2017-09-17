#!/bin/bash

if node -v | grep "^v8" > /dev/null; then

  set -e

  if [ -e /etc ]; then
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
  fi
  rm -rf .pkg
  mkdir .pkg
  for f in package* bootstrappers.js zeronet.js lib; do cp -r $f .pkg; done
  #ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")
  cd .pkg
  for f in package*; do sed -r 's|"([a-z-]+)": "file:(.*)"|"\1": "file:../\2.tar.gz"|g' -i $f; done
  npm i --production
  v="8.3.0" #Change with every new node version if that version gets available in pkg
  t=$(node -e 'switch(process.platform){case"win32":"win";break;case"darwin":"macos";break;default:process.platform}' -p)
  target="node$v-$t-x64"
  tt=$(echo "$target" | sed "s|-| |g")
  PKG_REPO=zeit/pkg-fetch ../node_modules/.bin/pkg-fetch $tt f || ../node_modules/.bin/pkg-fetch $tt f
  bin=$(node -e 'switch(process.platform){case"win32":"win.exe";break;case"darwin":"macos";break;default:process.platform}' -p)
  bin="zeronet-$bin"
  PKG_TARGET="$target" ../node_modules/.bin/pkg-natives
  if [ -e zeronet.exe ]; then
    mv zeronet.exe $bin
  else
    mv zeronet $bin
  fi
  for f in $(dir -w 0); do
    [ "$f" == "$bin" ] || rm -rfv $f
  done
  RUNINCWD=1 TESTOK=1 ./$bin
  rm -rf .zeronet
  echo "Created $bin!"
else
  echo "Please use node v8+ to build"
fi
