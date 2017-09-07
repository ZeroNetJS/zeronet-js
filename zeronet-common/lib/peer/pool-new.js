"use strict"

const EventEmitter = require("events").EventEmitter
const hypercache = require("hypercache")
const Peer = require("./peer-new.js")
const PeerInfo = require("peer-info")
const Id = require("peer-id")
const multiaddr = require("multiaddr")
const ip2multi = require("zeronet-common/lib/network/ip2multi")

function isInPool(cache, pi) {
  if (PeerInfo.isPeerInfo(pi))
    return cache.search(pi.id.toB58String())
  //return pi.multiaddrs.toArray().map(a => a.toString()).filter(a => !!cache.searchSets(a))[0]

  if (ip2multi.isIp(pi))
    return cache.search(pi)

  if (multiaddr.isMultiaddr(pi))
    return cache.searchSets(pi.toString())

  if (typeof pi == "string") {
    if (pi.match(/\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+/))
      return isInPool(cache, multiaddr(pi))

    if (pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+/))
      return isInPool(cache, multiaddr(pi))
  }

  throw new Error("Invalid type supplied to isInPool. Please report!")
}

class Getter extends EventEmitter {
  constructor(pool) {
    super()
    this.peers = []
    this.pool = pool
    pool.registerGetter(this)
  }
  push(peer) {
    this.peers.push(peer)
    this.emit("peer", peer)
  }
  get(cb) {
    if (this.peers.length) {
      return cb(null, this.peers.shift())
    } else {
      this.pool.discover()
      this.once("peer", () => cb(null, this.peers.shift()))
    }
  }
}

class Pool extends EventEmitter {
  constructor() {
    super()
    this.peers = []
  }
  discover() {
    this.emit("discover")
  }
  _push(peer) {
    this.peers.push(peer)
    this.emit("peer", peer)
  }
  toJSON() {
    return this.peers.map(p => p.toJSON())
  }
  registerGetter(get) {
    this.peers.forEach(p => get.push(p))
    this.on("peer", p => get.push(p))
  }
}

class ZitePool extends Pool {
  constructor(main, addr) {
    super()
    this.main = main
    main.on("seed." + addr, peer => this.push(peer))
    this.zite = addr
  }
  push(peer) {
    if (peer.isSeeding(this.zite)) {
      this._push(peer)
    }
  }
}

class MainPool extends Pool {
  constructor() {
    super()
    this.cache = new hypercache(null, {
      manual: true,
      keys: ["id", "ip"],
      sets: ["addrs"]
    })
  }
  push(peer) {
    this._push(peer)
    peer.on("seed", zite => this.emit("seed." + zite, peer))
    this.cache.update(this.peers)
    return peer
  }
  add(pi) {
    if (isInPool(this.cache, pi)) return false

    if (PeerInfo.isPeerInfo(pi))
      return this.push(new Peer.Lp2pPeer(pi))

    if (ip2multi.isIp(pi))
      return this.push(new Peer.ZeroPeer(ip2multi(pi)))

    if (multiaddr.isMultiaddr(pi)) {
      if (pi.toString().indexOf("ipfs") != -1) {
        const id = Id.createFromB58String(pi.toString().split("ipfs/").pop())
        const _pi = new PeerInfo(id)
        _pi.multiaddrs.addSafe(pi)
        return this.push(new Peer.Lp2pPeer(_pi))
      } else {
        return this.push(new Peer.ZeroPeer(pi.toString()))
      }
    }

    if (typeof pi == "string") {
      if (pi.match(/\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+/))
        return this.push(new Peer.ZeroPeer(pi))

      if (pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+/)) {
        const id = Id.createFromB58String(pi.split("ipfs/").pop())
        const _pi = new PeerInfo(id)
        _pi.multiaddrs.addSafe(pi)
        return this.push(new Peer.Lp2pPeer(_pi))
      }
    }

    return false
  }
}

module.exports = {
  MainPool,
  ZitePool,
  Getter
}
