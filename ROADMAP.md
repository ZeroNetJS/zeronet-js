[Return to README](https://github.com/ZeroNetJS/zeronet-js/blob/master/README.md)

# Roadmap

## The big todos

# Stage 0 - The basics

 - [x] Fileserver
 - [x] Trackers
 - [x] Peer managment
 - [x] Peer discovery
 - [x] Basic protocol implentation
 - [x] libp2p

# Stage 1

 - [ ] Loading Zites ([#55](https://github.com/ZeroNetJS/zeronet-js/issues/55))
 - [ ] UiServer ([#56](https://github.com/ZeroNetJS/zeronet-js/issues/56))
 - [ ] Ui ([#57](https://github.com/ZeroNetJS/zeronet-js/issues/57))
 - [ ] UPNP ([#58](https://github.com/ZeroNetJS/zeronet-js/issues/58))
 - [ ] ZeroFrame ([#59](https://github.com/ZeroNetJS/zeronet-js/issues/59))
 - [ ] Plugin API ([#60](https://github.com/ZeroNetJS/zeronet-js/issues/60))
 - [ ] Connection encryption (ZeroNetJS 2 ZeroNetJS already works via libp2p-secio - [#54](https://github.com/ZeroNetJS/zeronet-js/issues/54))

### Big bugs:
 - [x] Streams are buggy ([#5](https://github.com/ZeroNetJS/zeronet-js/issues/5))
 - [ ] New libp2p peer-id is slowing down startup ([#30](https://github.com/ZeroNetJS/zeronet-js/issues/30))
 - [ ] Pex command issues ([#31](https://github.com/ZeroNetJS/zeronet-js/issues/31))
 - [ ] Msgpack encoding issues ([#39](https://github.com/ZeroNetJS/zeronet-js/issues/39))
 - [ ] TLS RSA (segfaults - [#54](https://github.com/ZeroNetJS/zeronet-js/issues/54))

# Stage 2

 - [ ] Tor
 - [ ] Sidebar plugin
 - [ ] Torrent plugin
 - [ ] Customizable Ui

# Stage 3

 - [ ] Strict tor
 - [ ] I2P and Strict I2P
 - [ ] Plugin for IPFS integration
 - [ ] IPLD module

## Notes

It is not planned to support protocol version v1. Only v2+ will be supported.

Also for now all connections are **unencrypted**. So don't use this in production until beta or until we get tls/secio running.
