#!/bin/bash

#Git fix for snapcraft ci


#/usr/bin/git clone --depth=1 -q -b master git://github.com/dignifiedquire/webcrypto-shim.git /tmp/4590/.npm/_cacache/tmp/git-clone-8033ca6e
#$0                  $1        $2 $3 $4           $5                                             $6
mkdir -p $6
chmod 777 $6
/usr/bin/git $@
