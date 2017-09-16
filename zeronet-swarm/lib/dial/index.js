"use strict"

const multiaddr = require("multiaddr")
const Peer = require("peer-info")
const ip2multi = require("zeronet-common/lib/network/ip2multi")

const debug = require("debug")
const log = debug("zeronet:swarm:dial")

function getPeerIdType(pi) {
  if (Peer.isPeerInfo(pi))
    return "libp2p"

  if (ip2multi.isIp(pi))
    return "zero"

  if (multiaddr.isMultiaddr(pi)) {
    if (pi.toString().indexOf("ipfs") != -1)
      return "libp2p"
    return "zero"
  }

  if (typeof pi == "string") {
    if (pi.match(/\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+/))
      return "zero"

    if (pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+/))
      return "libp2p"
  }

  return false
}

function disabledThing(type) {
  return function () {
    const a = [...arguments]
    const f = a.filter(f => typeof f == "function")[0]
    if (f) {
      return f(new Error(type + " swarm disabled!"))
    }
  }
}

module.exports = function Dial(zero, lp2p) { //dynamic dialer that switches between streams
  if (!zero) zero = {
    dial: disabledThing("zero")
  }
  if (!lp2p) lp2p = {
    dial: disabledThing("libp2p"),
    cmd: disabledThing("libp2p")
  }
  const t = {
    zero,
    lp2p
  }
  let dial
  return (dial = (peer, protocol, data, cb) => {
    if (typeof data == "function") {
      cb = data
      data = null
    }
    if (typeof protocol == "function") {
      cb = protocol
      data = null
      protocol = null
    }

    let st

    const type = getPeerIdType(peer)
    const ntype = type == "libp2p" ? "lp2p" : (type || "zero")

    if (typeof protocol == "string" && typeof data == "object" && typeof cb == "function") {
      //zeronet peer cmd
      if (type == "zero") {
        st = "znv2->peercmd"
        zero.dial(peer, protocol, data, cb)
      } else {
        st = "lp2p->peercmd"
        lp2p.cmd(peer, protocol, data, cb)
      }
    } else if (typeof protocol == "string" && data == null && typeof cb == "function") {
      //libp2p dial
      if (type == "zero") {
        st = "znv2->(up)lp2p->proto"
        zero.dial(peer, (err, client, peerInfo) => {
          if (err) return cb(err)
          if (client) return cb(new Error("Tried libp2p dial on ZNv2 node"))
          if (peerInfo) lp2p.dial(peerInfo, protocol, cb)
        })
      } else {
        st = "lp2p->proto"
        lp2p.dial(peer, protocol, cb)
      }
    } else if (protocol == null && data == null && typeof cb == "function") {
      //just connect to the peer
      st = "(dial)" + ntype
      t[ntype].dial(peer, cb)
    }

    if (!st) return cb(new Error("Dial failure. Please check the arguments!"))

    log("dialing %s as %s (over %s)", peer.toString(), st, ntype)
  })
}
