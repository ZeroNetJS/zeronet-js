"use strict"

const EventEmitter = require("events").EventEmitter
const ip2multi = require("zeronet-common/lib/network/ip2multi")
const multi2ip = ip2multi.reverse4
const PeerInfo = require("peer-info")
const Id = require("peer-id")
const multiaddr = require("multiaddr")
const debug = require("debug")
const log = process.env.INTENSE_DEBUG ? debug("zeronet:peer") : () => {}

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
    const oe = this.emit.bind(this)
    this.emit = function () {
      const a = [...arguments]
      oe.apply(null, a)
      a.unshift("emit")
      oe.apply(null, a)
    }
    if (Id.isPeerId(id)) {
      this.id = id.toB58String()
      this._id = id
    } else {
      this._id = new Id(Buffer.from(id))
      this.id = this._id.toB58String()
    }
    if (PeerInfo.isPeerInfo(addrs)) {
      this.pi = addrs
    } else {
      this.pi = new PeerInfo(this._id)
      addrs.map(addr => multiaddr.isMultiaddr(addr) ? addr : multiaddr(addr)).forEach(addr => this.pi.multiaddrs.add(addr))
    }
    this.addrs = this.pi.multiaddrs.toArray().map(a => a.toString())
    this.multiaddr = this.addrs[0]
    log("created peer %s with address(es) %s", this.id, this.addrs.join(", "))
    this.zites = {}
    this.score = 0
    this.lfailedd = 0 //last failed dial time
  }
  seed(zite) {
    if (!this.zites[zite]) {
      log("peer %s (%s) now seeds %s", this.id, this.addrs.join(", "), zite)
      this.zites[zite] = new ZiteInfo(zite)
      this.emit("seed", zite)
      this.emit("seed." + zite)
    }
  }
  isSeeding(zite) {
    return !!this.zites[zite]
  }
  dial(cb) {
    if (this.score <= -100) return cb(new Error("Score too low"))
    if (this.isOnline) return cb()
    this.swarm.dial(this.dialable, err => {
      if (err) {
        this.score -= 10
        this.lfailedd = new Date().getTime()
      } else {
        this.score += 5
        this.isOnline = true
        this.emit("online")
      }
      cb(err)
    })
  }
  cmd(cmd, data, cb) {
    this.dial(err => {
      if (err) return cb(err)
      this.swarm.dial(this.dialable, cmd, data, (err, res) => {
        if (err) {
          this.score -= 5
          this.isOnline = true
        } else {
          this.score += 5
        }
        cb(err, res)
      })
    })
  }
  toJSON() {
    return {
      addrs: this.addrs,
      id: this.id,
      ip: this.ip,
      score: this.score,
      zites: Object.keys(this.zites).map(zite => this.zites[zite].toJSON())
    }
  }
}

class ZeroPeer extends Peer {
  constructor(addr) {
    super([addr], sha5(sha5(addr)).substr(0, 20))
    this.ip = multi2ip(addr)
    this.dialable = multiaddr(addr)
  }
}

class Lp2pPeer extends Peer {
  constructor(peer) {
    super(peer, peer.id)
    this.dialable = peer
  }
}

function fromJSON(data) {
  if (!data.id) return
  let peer
  if (data.ip) {
    peer = new ZeroPeer(data.addrs[0])
  } else {
    const id = Id.createFromB58String(data.id)
    const pi = new PeerInfo(id)
    data.addrs.forEach(a => pi.multiaddrs.addSafe(a))
    peer = new Lp2pPeer(pi)
  }
  data.zites.forEach(zite_ => {
    let zite = new ZiteInfo(zite_.addr)
    //TODO: hashfield
    peer.zites[zite.addr] = zite
  })
  log("peer %s seeds %s", peer.id, data.zites.map(z => z.addr).join(", "))
  return peer
}

module.exports = {
  ZeroPeer,
  Lp2pPeer,
  fromJSON
}
