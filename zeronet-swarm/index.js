"use strict"

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
//const WS = require(libp2p-websockets)
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')

const ZeroNet = require("zeronet-common") //shared class, used for storage and worker management

const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')

const debug = require("debug")
const Protocol = require("zeronet-protocol")
const zdial = require(__dirname + "/dial")
const each = require('async/each')
const series = require('async/series')
const clone = require("clone")

const mafmt = require('mafmt')

class Node extends libp2p {
  constructor(options, cb) {
    options = options || {}

    const peerInfo = new PeerInfo(options.id)
    const zOPT = clone(options)
    delete zOPT.server
    const zeronet = new ZeroNet(zOPT)

    const log = debug("zeronet:swarm")

    if (options.server)
      peerInfo.multiaddrs.add(multiaddr("/ip4/" + options.server.host + "/tcp/" + options.server.port))
    if (options.server6)
      peerInfo.multiaddrs.add(multiaddr("/ip6/" + options.server6.host + "/tcp/" + options.server6.port))

    if (peerInfo.multiaddrs._multiaddrs.length) log("starting server on", peerInfo.multiaddrs._multiaddrs.map(m => m.toString()))

    if (!options.trackers)
      options.trackers = [
        "zero://boot3rdez4rzn36x.onion:15441",
        "zero://boot.zeronet.io#f36ca555bee6ba216b14d10f38c16f7769ff064e0e37d887603548cc2e64191d:15441",
        "udp://tracker.coppersurfer.tk:6969",
        "udp://tracker.leechers-paradise.org:6969",
        "udp://9.rarbg.com:2710",
        "http://tracker.opentrackr.org:1337/announce",
        "http://explodie.org:6969/announce",
        "http://tracker1.wasabii.com.tw:6969/announce"
      ]

    if (!Array.isArray(options.trackers))
      options.trackers = [options.trackers]

    const modules = {
      transport: [
        new TCP(),
        //new WS()
      ],
      connection: {},
      discovery: [
        new MulticastDNS(peerInfo, 'zeronet') //allows us to find network-local nodes easier
      ],
      // DHT is passed as its own enabling PeerRouting, ContentRouting and DHT itself components
      dht: DHT
    }

    super(modules, peerInfo, /*peerBook*/ null, options)

    const self = this
    self.zeronet = zeronet
    self.peerInfo = peerInfo

    /* if it's hacky and you know it clap your hands. *clap* */
    self.protocol = new Protocol(self.swarm, self, zeronet)
    self.handle = self.protocol.handle.bind(self.protocol)

    self.swarm.dial = zdial(self.swarm, self.protocol)
    self.dial = self.swarm.dial

    self.protocol.applyDefaults()

    self.swarm.listen = cb => {
      each(self.swarm.availableTransports(peerInfo), (ts, cb) => {
        // Listen on the given transport
        self.swarm.transport.listen(ts, {}, self.protocol.upgradeConn({
          isServer: true
        }), cb)
      }, cb)
    }

    self.start = (callback) => { //modified from libp2p/src/index.js to allow dialing without listener
      if (!self.modules.transport) {
        return callback(new Error('no transports were present'))
      }

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
          if (this._dht) {
            return this._dht.start(cb)
          }
          cb()
        }
      ], callback)
    }

    self.start(cb)
  }
}

Node.zeronet = require("zeronet-common")

module.exports = Node
