# This is how the module tree should look like

zeronet
  + zeronet-node*
    + zeronet-swarm
      + zeronet-protocol
        + zeronet-client
    + zeronet-zite*+
    + zeronet-fileserver
  + zeronet-crypto
  + zeronet-storage-{fs,memory}

### Explain

 - \* = Still requires zeronet-common (is being deperacted)
 - \+ = Will be split up
