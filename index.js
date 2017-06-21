"use strict"

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
//const WS = require('libp2p-websockets')
//const spdy = require('libp2p-spdy')
//const secio = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')

const ZeroNet = require(__dirname + "/lib/zeronet") //shared class, used for storage and worker management

const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')

const Client = require(__dirname + "/lib/client")
const zdial = require(__dirname + "/lib/dial")
const each = require('async/each')
const getRaw = require("pull-stream-to-stream")

class Node extends libp2p {
  constructor(options, cb) {
    options = options || {}

    const peerInfo = new PeerInfo(options.id)
    const zeronet = new ZeroNet({})

    if (options.server)
      peerInfo.multiaddrs.add(multiaddr("/ip4/" + options.server.host + "/tcp/" + options.server.port))

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
      connection: {
        /*muxer: [
          spdy
        ],
        crypto: [
          secio
        ]*/
      },
      discovery: [
        new MulticastDNS(peerInfo, 'zeronet')
      ],
      // DHT is passed as its own enabling PeerRouting, ContentRouting and DHT itself components
      dht: DHT
    }

    super(modules, peerInfo, /*peerBook*/ null, options)

    function incomingHandler(conn) {
      const stream = getRaw(conn)
      conn.zero = new Client({
        stream: stream
      }, zeronet)
    }

    const self = this
    self.zeronet = zeronet

    /* if it's hacky and you know it clap your hands. *clap* */
    self.swarm.dial = zdial(self.swarm)
    self.dial = self.swarm.dial

    self.swarm.listen = cb => {
      each(self.swarm.availableTransports(peerInfo), (ts, cb) => {
        // Listen on the given transport
        self.swarm.transport.listen(ts, {}, incomingHandler, cb)
      }, cb)
    }

    self.start(cb)
  }
}

Node.zeronet = require(__dirname + "/lib/zeronet")

module.exports = Node
