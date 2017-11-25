# This is how the module tree should look like

zeronet
  + zeronet-node*
    + zeronet-swarm*
      + zeronet-protocol*
        + zeronet-client*
    + zeronet-zite*+
    + zeronet-fileserver
  + zeronet-storage-{fs,memory}

### Explain

 - \* = Requires duct tape (aka zeronet-common)
 - \+ = Requires to be split up
