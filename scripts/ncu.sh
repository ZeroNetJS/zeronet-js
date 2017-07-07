#!/bin/bash

set -e

op="$PWD"

for file in . $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    cd $file
    ncu -u -a
    rm -rf node_modules package-lock.json
    cd $op
  fi
done

bash scripts/install.sh
