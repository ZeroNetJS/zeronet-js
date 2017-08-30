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

const EE = require('events').EventEmitter
const {
  map,
  parallel
} = require("async")

//websocket-star
const WSStar = require("libp2p-websocket-star")
class WebsocketStarMulti { //listen on multiple websocket star servers without having to worry about one being down.
  // NOTE: if no servers are reachable or provided an error is thrown
  constructor(opt) {
    this.log = debug("zeronet:swarm:websocket-star-multi")
    this.opt = opt || {}
    this.servers = opt.servers || []
    this.ws = new WSStar(this.opt)
    this.discovery = this.ws.discovery
  }
  dial(ma, opt, cb) {
    this.log("dial", ma)
    return this.ws.dial(ma, opt, cb)
  }
  createListener(options, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    const listener = new EE()
    listener.servers = {}
    listener.online = []
    this.servers.forEach(ser => {
      const s = this.ws.createListener(options, handler)
      s.once("error", () => {})
      s.url = s
      listener.servers[ser] = s
    })

    listener.listen = (ma, cb) => {
      const id = ma.toString().split("ipfs/").pop()
      this.log("listen on %s servers with id %s", this.servers.length, id)
      parallel(this.servers.map(url => listener.servers[url]).map(server =>
        cb => {
          server.listen(multiaddr(server.url).encapsulate("ipfs/" + id), err => {
            if (err) return cb()
            listener.online.push(server)
            return cb()
          })
        }), () => {
        if (!listener.online.length) {
          const e = new Error("Couldn't listen on any of the servers")
          listener.emit("error", e)
          cb(e)
        } else {
          listener.emit("listening")
          cb()
        }
      })
    }

    listener.close = cb =>
      parallel(listener.online.map(s => cb => s.close(cb)), err => cb(err, (listener.online = [])))

    listener.getAddrs = cb => map(listener.online, (s, n) => s.getAddrs(n), (err, res) => {
      if (err) return cb(err)
      return cb(null, res.reduce((a, b) => a.concat(b), []))
    })

    return listener

  }

  filter(ma) {
    if (ma.toString().startsWith("/libp2p-webrtc-star")) return true //we essentially use all the addresses of webrtc-star
  }
}

//discovery
const Railing = require("libp2p-railing")
const MulticastDNS = require('libp2p-mdns')

//dht
const DHT = require('libp2p-kad-dht')

function Libp2pSwarm(opt /*, protocol, zeronet*/ ) {
  const self = this

  log("creating libp2p swarm")

  const peerInfo = new PeerInfo(opt.id);
  (opt.listen || []).forEach(addr => peerInfo.multiaddrs.add(multiaddr(addr)))
  self.adv = []
  //peerInfo.multiaddrs.forEach(ma => )
  let dht

  let discovery = []

  let transport = opt.transports || []

  if (opt.bootstrap && opt.bootstrap.length) discovery.push(new Railing(opt.bootstrap))
  if (opt.mdns) discovery.push(new MulticastDNS(peerInfo, "zeronet"))
  if (opt.dht) dht = DHT
  if (opt.custom_dht) dht = opt.custom_dht
  if (opt.wstar) { //wstar is an array with servers for wstar multi
    const wsm = new WebsocketStarMulti({
      servers: opt.wstar,
      id: opt.id
    })
    peerInfo.multiaddrs.add(multiaddr("/libp2p-webrtc-star"))
    transport.push(wsm)
    discovery.push(wsm.discovery)
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
