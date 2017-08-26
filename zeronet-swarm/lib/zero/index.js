"use strict"

const NAT = require("./nat")
const multiaddr = require("multiaddr")

const debug = require("debug")
const log = debug("zeronet:swarm:zn")

const once = require("once")
const each = require("async/each")
const series = require("async/series")
const parallel = require('async/parallel')

const ZProtocol = require("zeronet-protocol").Zero

const Peer = require("peer-info")
const ip2multi = require("zeronet-common/lib/network/ip2multi")

function getMultiaddrList(pi) {
  if (Peer.isPeerInfo(pi))
    return Peer.multiaddrs

  if (multiaddr.isMultiaddr(pi))
    return [pi]

  if (ip2multi.isIp(pi))
    return [multiaddr(ip2multi(pi, "tcp"))]

  if (typeof pi == "string" && (pi.match(/\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+/) || pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+/)))
    return [multiaddr(pi)]

  return []
}

function createListeners(transport, ma, handler) {
  return dialables(transport, ma).map((ma) => {
    return (cb) => {
      const done = once(cb)
      const listener = transport.createListener(handler)
      listener.once('error', done)

      listener.listen(ma, (err) => {
        if (err) {
          return done(err)
        }
        listener.removeListener('error', done)
        transport.listeners.push(listener)
      })
    }
  })
}

function closeListeners(transport, callback) {
  parallel(transport.listeners.map((listener) => {
    return (cb) => {
      listener.close(cb)
    }
  }), callback)
}

//ZNv2 swarm using libp2p-transports

function dialables(tp, multiaddrs) {
  return tp.filter(multiaddrs)
}

function ZNV2Swarm(opt, protocol, zeronet, lp2p) {
  const self = this
  const proto = self.proto = self.protocol = new ZProtocol({
    crypto: opt.crypto
  }, zeronet)

  const tr = self.transport = {}
  const ma = self.multiaddrs = opt.listen.map(m => multiaddr(m))

  opt.transports.forEach(transport => {
    tr[transport.tag || transport.constructor.name] = transport
    if (!transport.listeners)
      transport.listeners = []
  })

  function listen(cb) {
    each(Object.keys(tr), (t, next) =>
      parallel(createListeners(tr[t], ma, proto.upgradeConn({
        isServer: true
      })), next), cb)
  }

  function unlisten(cb) {
    each(Object.keys(tr), (t, next) =>
      parallel(closeListeners(tr[t]), next), cb)
  }

  self.advertise = {
    ip: null,
    port: null,
    port_open: null
  }

  let nat
  if (opt.nat) nat = self.nat = new NAT(self, opt)

  self.start = cb => series([
    listen,
    nat ? nat.doDefault : cb => cb()
  ], cb)
  self.stop = cb => series([
    unlisten
  ], cb)

  self.dial = (peer, cmd, data, cb) => {

  }

  self.connect = (peer, cb) => {
    const addrs = getMultiaddrList(peer).slice(0)
    if (!addrs.length) return cb(new Error("No addresses found in peerInfo"))

    log("dialing %s address(es)", addrs.length)

    function tryDial(ma, cb) {
      //TODO: add dialing
    }

    function dialLoop() {
      const a = addrs.shift()
      if (!a) return cb(new Error("Couldn't dial into any of the addresses"))
      log("dialing %s", a)
      tryDial(a, (err, conn, upgradeable) => {
        if (err) return dialLoop()
        if (!upgradeable) return cb(null, conn)
      })
    }
    dialLoop()
  }
}
module.exports = ZNV2Swarm
