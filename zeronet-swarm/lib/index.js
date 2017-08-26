"use strict"

//2 swarms
//Libp2p on *:15542
//ZNv2 on *:15543
//don't ever put 2 swarms on the same port

const ZeroSwarm = require("./zero")
const libp2p = require("libp2p")

function ZeroNetSwarm(opt) {
  const self = this
  const zero = self.zero = new ZeroSwarm(opt.zero || {})
}

module.exports = ZeroNetSwarm
/*"use strict"

const libp2p = require('libp2p')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')

const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')

const SPDY = require('libp2p-spdy')
const MULTIPLEX = require('libp2p-multiplex')
const SECIO = require('libp2p-secio')

const debug = require("debug")
const log = debug("zeronet:swarm")
const Protocol = require("zeronet-protocol")
const zdial = require("zeronet-swarm/dial")
const each = require('async/each')
const series = require('async/series')

const mafmt = require('mafmt')

class ZeroNetSwarm extends libp2p {
  constructor(options, zeronet) {
    options = options || {}
    options.libp2p = options.libp2p || {
      transport: []
    }

    const peerInfo = new PeerInfo(options.id)

    if (options.listen) {
      if (!Array.isArray(options.listen)) options.listen = [options.listen]
      options.listen.forEach(addr => peerInfo.multiaddrs.add(multiaddr(addr)))
    } else {
      if (options.server)
        peerInfo.multiaddrs.add(multiaddr("/ip4/" + options.server.host + "/tcp/" + options.server.port))
      if (options.server6)
        peerInfo.multiaddrs.add(multiaddr("/ip6/" + options.server6.host + "/tcp/" + options.server6.port))
    }

    if (peerInfo.multiaddrs._multiaddrs.length) log("starting server on", peerInfo.multiaddrs._multiaddrs.map(m => m.toString()))

    const modules = {
      transport: options.libp2p.transport,
      connection: {
        muxer: [
          MULTIPLEX,
          SPDY
        ],
        crypto: [SECIO]
      },
      discovery: [
        options.libp2p.mdns ? new MulticastDNS(peerInfo, 'zeronet') : null //allows us to find network-local nodes easier
      ].filter(e => !!e),
      // DHT is passed as its own enabling PeerRouting, ContentRouting and DHT itself components
      dht: options.libp2p.dht ? DHT : false
    }

    super(modules, peerInfo, null)

    const self = this
    self.zeronet = zeronet
    self.peerInfo = peerInfo

    /* if it's hacky and you know it clap your hands. *clap*
    self.libp2p_native = options.libp2p.native
    self.protocol = new Protocol(self.swarm, self, zeronet, options.protocol)
    self.handleZN = self.protocol.handle.bind(self.protocol)

    self.swarm.dial = zdial(self.swarm, self.protocol)
    self.dial = self.swarm.dial
    self.swarm.dialZN = self.dial.dialZN
    self.dialZN = self.dial.dialZN

    self.protocol.applyDefaults()

    self.advertise = {
      ip: null,
      port: null,
      port_open: null
    }

    self.swarm.listen = cb => {
      each(self.swarm.availableTransports(peerInfo), (ts, cb) => {
        // Listen on the given transport
        self.swarm.transport.listen(ts, {}, self.protocol.upgradeConn({
          isServer: true
        }), cb)
      }, cb)
    }

    self.start = (callback) => { //modified from libp2p/src/index.js to allow dialing without listener
      if (!self.modules.transport)
        return callback(new Error('no transports were present'))

      let transports = self.modules.transport

      transports = Array.isArray(transports) ? transports : [transports]

      // so that we can have webrtc-star addrs without adding manually the id
      const maOld = []
      const maNew = []
      this.peerInfo.multiaddrs.forEach((ma) => {
        if (!mafmt.IPFS.matches(ma)) {
          maOld.push(ma)
          maNew.push(ma.encapsulate('/ipfs/' + this.peerInfo.id.toB58String()))
        }
      })
      this.peerInfo.multiaddrs.replace(maOld, maNew)

      transports.forEach((transport) => {
        this.swarm.transport.add(
          transport.tag || transport.constructor.name, transport)
      })

      series([
        (cb) => this.swarm.listen(cb),
        (cb) => {
          // listeners on, libp2p is on
          this.isOnline = true

          // all transports need to be setup before discover starts
          if (this.modules.discovery) {
            return each(this.modules.discovery, (d, cb) => d.start(cb), cb)
          }
          cb()
        },
        (cb) => {
          // XXX: chicken-and-egg problem:
          // have to set started here because DHT requires libp2p is already started
          this._isStarted = true
          if (this._dht) {
            return this._dht.start(cb)
          }
          cb()
        },
        (cb) => {
          this.emit('start')
          cb()
        }
      ], callback)
    }
  }
}

module.exports = ZeroNetSwarm*/
