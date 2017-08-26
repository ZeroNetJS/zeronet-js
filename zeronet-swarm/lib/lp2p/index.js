"use strict"

//basics
const libp2p = require("libp2p")

//multiformats
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')

//libp2p connection
const SPDY = require('libp2p-spdy')
const MULTIPLEX = require('libp2p-multiplex')
const SECIO = require('libp2p-secio')

//discovery
const Railing = require("libp2p-railing")
const MulticastDNS = require('libp2p-mdns')

//dht
const DHT = require('libp2p-kad-dht')

function Libp2pSwarm(opt) {
  const self = this

  const peerInfo = new PeerInfo(opt.id);
  (opt.libp2p.listen || []).forEach(addr => peerInfo.multiaddrs.add(multiaddr(addr)))

  let dht

  let discovery = []

  if (opt.libp2p.bootstrap && opt.libp2p.bootstrap.length) discovery.push(new Railing(opt.libp2p.bootstrap))
  if (opt.libp2p.mdns) discovery.push(new MulticastDNS(peerInfo, "zeronet"))
  if (opt.libp2p.dht) dht = DHT
  if (opt.libp2p.custom_dht) dht = opt.libp2p.custom_dht

  const modules = {
    transport: opt.libp2p.transports || [],
    connection: {
      muxer: [
        MULTIPLEX,
        SPDY
      ],
      crypto: [SECIO]
    },
    discovery: (opt.libp2p.discover || []).concat(discovery),
    dht
  }

  const lp2p = self.lp2p = self.libp2p = new libp2p(modules, peerInfo /*, peerBook*/ )
}
module.exports = Libp2pSwarm
