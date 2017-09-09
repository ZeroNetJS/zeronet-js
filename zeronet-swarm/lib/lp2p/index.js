"use strict"

//basics
const libp2p = require("libp2p")
const series = require("async/series")
const LProtocol = require("zeronet-protocol").Lp2p
const debug = require("debug")
const log = debug("zeronet:swarm:libp2p")

//multiformats
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')

//libp2p connection
const SPDY = require('libp2p-spdy')
const MULTIPLEX = require('libp2p-multiplex')
const SECIO = require('libp2p-secio')

//websocket-star
const WebsocketStarMulti = require("libp2p-websocket-star-multi")

//discovery
const Railing = require("libp2p-railing")
const MulticastDNS = require('libp2p-mdns')

//dht
const DHT = require('libp2p-kad-dht')

function Libp2pSwarm(opt, protocol, zeronet) {
  const self = this

  log("creating libp2p swarm")

  const peerInfo = new PeerInfo(opt.id);
  (opt.listen || []).forEach(addr => peerInfo.multiaddrs.add(multiaddr(addr)))
  self.adv = []
  //peerInfo.multiaddrs.forEach(ma => )
  let dht

  let discovery = []

  let transport = opt.transports || []

  if (opt.bootstrap && opt.bootstrap.length) {
    discovery.push(new Railing(opt.bootstrap))
    log("enabled bootstrap with %s peer(s)", opt.bootstrap.length)
  }
  if (opt.mdns) {
    discovery.push(new MulticastDNS(peerInfo, "zeronet"))
    log("enabled multicast-dns")
  }
  if (opt.dht) dht = DHT
  if (opt.custom_dht) dht = opt.custom_dht
  if (dht) log("enabled dht")
  if (opt.wstar) { //wstar is an array with servers for wstar multi
    const wsm = new WebsocketStarMulti({
      servers: opt.wstar,
      ignore_no_online: opt.wstar_ignore,
      id: opt.id
    })
    peerInfo.multiaddrs.add(multiaddr("/p2p-websocket-star"))
    transport.push(wsm)
    discovery.push(wsm.discovery)
    log("enabled websocket-star-multi with %s server(s) (ignore if unreachable %s)", opt.wstar.length, opt.wstar_ignore || false)
  }

  const modules = {
    transport,
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
  const swarm = lp2p
  swarm.on("peer:discovery", pi => {
    const next = () => swarm.dial(pi, () => {})
    if (swarm.isStarted()) next()
    else swarm.once("start", next)
  })
  swarm.on("peer:connect", peer => {
    const npeer = zeronet.peerPool.add(peer)
    npeer.dial(() => {})
  })

  self.start = cb => series([
    cb => lp2p.start(cb),
    cb => {
      self.adv = []
      peerInfo.multiaddrs.forEach(ma => self.adv.push(ma.toString()))
      cb()
    }
  ], cb)

  self.stop = cb => lp2p.stop(cb)

  self.dial = (peer, proto, cb) => lp2p.dial(peer, proto, cb)

  self.proto = self.protocol = new LProtocol({}, self)
}
module.exports = Libp2pSwarm
