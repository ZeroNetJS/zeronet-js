"use strict"

const debug = require("debug")
const log = debug("zeronet:swarm:zero:dial")
const multiaddr = require("multiaddr")

const uuid = require("uuid")
const crypto = require("crypto")
const sha5 = text => crypto.createHash('sha512').update(text).digest('hex')
const LimitDialer = require("libp2p-swarm/src/limit-dialer")

const Id = require("peer-id")
const Peer = require("peer-info")
const ip2multi = require("zeronet-common/lib/network/ip2multi")

function dialables(tp, multiaddrs) {
  return tp.filter(multiaddrs)
}

function peerInfoFromMultiaddrs(addrs) {
  const b58 = addrs[0].split("/")[0]
  const id = Id.createFromB58String(b58)
  const info = new Peer(id)
  addrs.forEach(addr => info.multiaddrs.add(multiaddr(addr)))
  return info
}

function getMultiaddrList(pi) {
  if (Peer.isPeerInfo(pi))
    return Peer.multiaddrs.toArray()

  if (multiaddr.isMultiaddr(pi))
    return [pi]

  if (ip2multi.isIp(pi))
    return [multiaddr(ip2multi(pi, "tcp"))]

  if (typeof pi == "string" && (pi.match(/\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+/) || pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+/)))
    return [multiaddr(pi)]

  return []
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

module.exports = function ZeroSwarmDial(swarm, lp2p) {
  const self = swarm
  const tr = self.transport

  const upgradeClient = self.proto.upgradeConn({
    isServer: false
  })

  const conns = self.conns = {}
  const dialer = new LimitDialer(8, 10 * 1000) //defaults from libp2p-swarm

  self.connect = (peer, cb) => {
    const addrs = getMultiaddrList(peer).slice(0)
    if (!addrs.length) return cb(new Error("No addresses found in peerInfo"))

    log("dialing %s address(es)", addrs.length)

    const job = addrs.length == 1 ? sha5(sha5(addrs[0].toString())).substr(0, 10) : uuid()
    const peerInfo = {
      toB58String() {
        return job
      }
    }
    const jobs = sortByTransport(tr, addrs)

    function finishLibp2p(peer, cb) {
      lp2p.dial(peer, err => {
        if (err) return cb(err)
        cb(null, null, peer)
      })
    }

    function finish(multiaddr, conn, cb) {
      upgradeClient(conn, (err, client, upgradeable) => {
        if (err) return cb(err)
        if (!upgradeable) {
          conn.client = client
          client.ma = multiaddr
          conns[multiaddr] = conn
          return cb(null, client)
        } else {
          const peer = peerInfoFromMultiaddrs(upgradeable)
          addrs.map(a => a.toString()).forEach(a => conns[a] = peer)
          finishLibp2p(peer, cb)
        }
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
    else {
      if (Peer.isPeerInfo(readyconns[0])) cb(null, null, readyconns[0]) //upgrade is handled in .dial
      else cb(null, readyconns[0].client)
    }
  }

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
    self.connect(peer, (err, client, peerInfo) => {
      if (err) return cb(err)
      if (peerInfo) {
        if (!cmd) return cb(null, null, peerInfo)
        else lp2p.cmd(peerInfo, cmd, data, cb)
      } else {
        if (!cmd) return cb(null, client)
        if (!client.cmd[cmd]) return cb(new Error("CMD Unsupported!")) //TODO: use a real method for that
        client.cmd[cmd](data, cb)
      }
    })
  }
}
