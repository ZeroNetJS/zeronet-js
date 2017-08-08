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

 - [ ] Save peer-id in config ([#63](https://github.com/ZeroNetJS/zeronet-js/issues/63))
 - [ ] Loading Zites ([#55](https://github.com/ZeroNetJS/zeronet-js/issues/55))
 - [ ] UiServer ([#56](https://github.com/ZeroNetJS/zeronet-js/issues/56))
 - [ ] Ui ([#57](https://github.com/ZeroNetJS/zeronet-js/issues/57))
 - [ ] UPNP ([#58](https://github.com/ZeroNetJS/zeronet-js/issues/58))
 - [ ] ZeroFrame ([#59](https://github.com/ZeroNetJS/zeronet-js/issues/59))
 - [ ] Plugin API ([#60](https://github.com/ZeroNetJS/zeronet-js/issues/60))
 - [ ] Connection encryption (ZeroNetJS 2 ZeroNetJS already works via libp2p-secio - [#54](https://github.com/ZeroNetJS/zeronet-js/issues/54))

### Big bugs:
 - [x] Streams are buggy ([#5](https://github.com/ZeroNetJS/zeronet-js/issues/5))
 - [ ] TLS server => client is broken ([#1](https://github.com/ZeroNetJS/zeronet-js/issues/1))
 - [ ] New libp2p peer-id is slowing down startup ([#30](https://github.com/ZeroNetJS/zeronet-js/issues/30))
 - [ ] Pex command issues ([#31](https://github.com/ZeroNetJS/zeronet-js/issues/31))
 - [ ] Msgpack encoding issues ([#39](https://github.com/ZeroNetJS/zeronet-js/issues/39))
 - [ ] TLS RSA (segfaults - [#54](https://github.com/ZeroNetJS/zeronet-js/issues/54))
 - [ ] Lower the peers score by 20 every time an error response is returned ([#46](https://github.com/ZeroNetJS/zeronet-js/issues/46))

# Stage 2

 - [ ] Tor ([#65](https://github.com/ZeroNetJS/zeronet-js/issues/65))
 - [ ] Sidebar plugin ([#66](https://github.com/ZeroNetJS/zeronet-js/issues/66))
 - [ ] Torrent plugin ([#67](https://github.com/ZeroNetJS/zeronet-js/issues/67))
 - [ ] Customizable Ui ([#68](https://github.com/ZeroNetJS/zeronet-js/issues/68))

# Stage 3

 - [ ] Strict tor
 - [ ] I2P and Strict I2P
 - [ ] Plugin for IPFS integration
 - [ ] IPLD module

## Notes

It is not planned to support protocol version v1. Only v2+ will be supported.

Also for now all connections are **unencrypted**. So don't use this in production until beta or until we get tls/secio running.
