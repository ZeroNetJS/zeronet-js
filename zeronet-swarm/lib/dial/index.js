"use strict"

const multiaddr = require("multiaddr")
const Peer = require("peer-info")
const ip2multi = require("zeronet-common/lib/network/ip2multi")

function getPeerIdType(pi) {
  if (Peer.isPeerInfo(pi))
    return "libp2p"

  if (ip2multi.isIp(pi))
    return "zero"

  if (multiaddr.isMultiaddr(pi)) {
    if (pi.toString().indexOf("ipfs") != -1) {
      return "libp2p"
    }
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

module.exports = function Dial(zero, lp2p) { //dynamic dialer that switches between streams
  const t = {
    zero,
    lp2p
  }
  return (peer, protocol, data, cb) => {
    if (typeof data == "function") {
      cb = data
      data = null
    }
    if (typeof protocol == "function") {
      cb = protocol
      data = null
      protocol = null
    }

    const type = getPeerIdType(peer)
    const ntype = peer == "libp2p" ? "lp2p" : (peer || "zero")

    if (typeof protocol == "string" && typeof data == "object" && typeof cb == "function") {
      //zeronet peer cmd
    } else if (typeof protocol == "string" && data == null && typeof cb == "function") {
      //libp2p dial
      if (type == "zero") return cb(new Error("Tried libp2p dial on ZNv2 node"))
    } else if (protocol == null && data == null && typeof cb == "function") {
      //just connect to the peer
      t[ntype].dial(peer, cb)
    }
  }
}
