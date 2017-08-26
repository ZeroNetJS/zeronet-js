"use strict"

//basics
const libp2p = require("libp2p")
const series = require("async/series")

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
  (opt.listen || []).forEach(addr => peerInfo.multiaddrs.add(multiaddr(addr)))
  self.adv = []
  //peerInfo.multiaddrs.forEach(ma => )
  let dht

  let discovery = []

  if (opt.bootstrap && opt.bootstrap.length) discovery.push(new Railing(opt.bootstrap))
  if (opt.mdns) discovery.push(new MulticastDNS(peerInfo, "zeronet"))
  if (opt.dht) dht = DHT
  if (opt.custom_dht) dht = opt.custom_dht

  const modules = {
    transport: opt.transports || [],
    connection: {
      muxer: [
        MULTIPLEX,
        SPDY
      ],
      crypto: [SECIO]
    },
    discovery: (opt.discover || []).concat(discovery),
    dht
  }

  const lp2p = self.lp2p = self.libp2p = new libp2p(modules, peerInfo /*, peerBook*/ )

  self.start = cb => series([
    lp2p.start.bind(lp2p),
    cb => {
      self.adv = []
      peerInfo.multiaddrs.forEach(ma => self.adv.push(ma.toString()))
      cb()
    }
  ], cb)
  self.stop = lp2p.stop.bind(lp2p)
}
module.exports = Libp2pSwarm
