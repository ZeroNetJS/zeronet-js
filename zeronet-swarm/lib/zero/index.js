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
const LimitDialer = require("libp2p-swarm/src/limit-dialer")
const uuid = require("uuid")

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

function sortByTransport(tr, addrs) {
  let r = []
  for (var p in tr) {
    const d = dialables(tr[p], addrs)
    if (d.length) r.push({
      transport: tr[p],
      tr_name: p,
      addrs: d
    })
  }
  return r
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

  const conns = self.conns = {}
  const dialer = new LimitDialer(8, 10 * 1000) //defaults from libp2p-swarm

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

  self.dial = (peer, cmd, data, cb) => { //TODO: handle upgrading
    if (typeof cmd == "function") {
      cb = cmd
      cmd = null
      data = null
    }
    if (typeof data == "function") {
      cb = data
      data = {}
    }
    self.connect(peer, (err, client) => {
      if (err) return cb(err)
      if (!cmd) return cb(null, client)
      if (!client.cmd[cmd]) return cb(new Error("CMD Unsupported!")) //TODO: use a real method for that
      client.cmd[cmd](data, cb)
    })
  }

  const upgradeClient = proto.upgradeConn({
    isServer: false
  })

  self.connect = (peer, cb) => {
    const addrs = getMultiaddrList(peer).slice(0)
    if (!addrs.length) return cb(new Error("No addresses found in peerInfo"))

    log("dialing %s address(es)", addrs.length)

    const job = uuid()
    const peerInfo = {
      toB58String() {
        return job
      }
    }
    const jobs = sortByTransport(addrs, tr)

    function finish(multiaddr, conn, cb) {
      upgradeClient(conn, (err, client) => {
        if (err) return cb(err)
        conn.client = client
        client.ma = multiaddr
        conns[multiaddr] = conn
        return cb(null, client)
      })
    }

    function tryDial(j, cb) {
      dialer.dialMany(peerInfo, j.transport, j.addrs, (err, success) => {
        if (err) return cb(err)
        log("successfully dialed %s", success.multiaddr.toString())
        return cb(null, success.multiaddr.toString(), success.conn)
      })
    }

    function dialLoop() {
      const j = jobs.shift()
      if (!j) return cb(new Error("Couldn't dial into any of the addresses"))
      log("dialing with %s (%s address(es))", j.tr_name, j.addrs.length)
      tryDial(j, (err, multiaddr, conn) => {
        if (err) return dialLoop()
        return finish(multiaddr, conn, cb)
      })
    }

    const readyconns = addrs.map(a => a.toString()).filter(a => conns[a]).map(a => conns[a])
    if (!readyconns.length) dialLoop()
    else cb(null, readyconns[0].client)
  }
}
module.exports = ZNV2Swarm
