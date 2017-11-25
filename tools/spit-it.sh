#!/bin/bash

# Just SPLIT it!

r="zeronet-$1"
git subtree split -P $r -b $r
git rm -r $r
git commit -m "Split $r from tree"
cd ..
mkdir $r
cd $r
git init
git commit --allow-empty
git remote add znjs ../zeronet-js
git fetch znjs
git reset --hard znjs/$r
echo "Split in ../$r"
