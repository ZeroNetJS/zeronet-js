"use strict"

const EventEmitter = require("events").EventEmitter
const ip2multi = require("zeronet-common/lib/network/ip2multi")
const multi2ip = ip2multi.reverse4
const PeerInfo = require("peer-info")
const Id = require("peer-id")
const multiaddr = require("multiaddr")

const crypto = require("crypto")
const sha5 = text => crypto.createHash('sha512').update(text).digest('hex')

class Hashfield {
  constructor() {
    //TODO: implement
  }
}

class ZiteInfo {
  constructor(addr) {
    this.addr = addr
    this.hashfield = new Hashfield()
  }
  toJSON() {
    return {
      addr: this.addr
    }
  }
}

class Peer extends EventEmitter {
  constructor(addrs, id) {
    super()
    if (Id.isPeerId(id)) {
      this.id = id.toB58String()
      this._id = id
    } else {
      this.id = id
      this._id = new Id(Buffer.from(id))
    }
    if (PeerInfo.isPeerInfo(addrs)) {
      this.pi = addrs
    } else {
      this.pi = new PeerInfo(this._id)
      addrs.map(addr => multiaddr.isMultiaddr(addr) ? addr : multiaddr(addr)).forEach(addr => this.pi.multiaddrs.addSafe(addr))
    }
    this.addrs = this.pi.multiaddrs.toArray().map(a => a.toString())
    this.zites = {}
    this.score = 0
  }
  seed(zite) {
    if (!this.zites[zite]) {
      this.zites[zite] = new ZiteInfo(zite)
      this.emit("seed", zite)
    }
  }
  isSeeding(zite) {
    return !!this.zites[zite]
  }
  toJSON() {
    return {
      addrs: this.addrs,
      id: this.id,
      score: this.score,
      zites: Object.keys(this.zites).map(zite => this.zites[zite].toJSON())
    }
  }
}

class ZeroPeer extends Peer {
  constructor(addr) {
    super([addr], sha5(sha5(addr)))
    this.ip = multi2ip(addr)
  }
}

class Lp2pPeer extends Peer {
  constructor(peer) {
    super(peer, peer.id)
  }
}

module.exports = {
  ZeroPeer,
  Lp2pPeer
}
