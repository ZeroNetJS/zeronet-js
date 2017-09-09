"use strict"

const EventEmitter = require("events").EventEmitter
const hypercache = require("hypercache")
const Peer = require("./")
const PeerInfo = require("peer-info")
const Id = require("peer-id")
const multiaddr = require("multiaddr")
const ip2multi = require("zeronet-common/lib/network/ip2multi")
const debug = require("debug")
const log = process.env.INTENSE_DEBUG ? debug("zeronet:pool") : () => {}

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
  fromJSON(data, cb) {
    data.map(d => Peer.fromJSON(d)).filter(e => !!e).forEach(peer => this.push(peer))
    cb()
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
    main.registerGetter(this)
  }
  push(peer) {
    if (peer.isSeeding(this.zite)) {
      log("adding %s to zitepool:%s", peer.id, this.zite)
      this._push(peer)
    }
  }
}

class MainPool extends Pool {
  constructor(swarm) {
    super()
    this.cache = new hypercache(null, {
      manual: true,
      keys: ["id", "ip"],
      sets: ["addrs"],
      name: "peers"
    })
    this.swarm = swarm
    this.cache.update([])
  }
  push(peer, lazy) {
    this._push(peer)
    peer.swarm = this.swarm
    const self = this
    peer.on("emit", function () {
      self.emit.apply(this, arguments)
    })
    if (!lazy) this.cache.update(this.peers)
    return peer
  }
  add(pi, lazy) {
    let p = isInPool(this.cache, pi)
    if (p.length > 1) throw new Error("Multiple peers found!")
    if (p.length) return p.pop()

    if (PeerInfo.isPeerInfo(pi))
      return this.push(new Peer.Lp2pPeer(pi), lazy)

    if (ip2multi.isIp(pi))
      return this.push(new Peer.ZeroPeer(ip2multi(pi)), lazy)

    if (multiaddr.isMultiaddr(pi)) {
      if (pi.toString().indexOf("ipfs") != -1) {
        const id = Id.createFromB58String(pi.toString().split("ipfs/").pop())
        const _pi = new PeerInfo(id)
        _pi.multiaddrs.addSafe(pi)
        return this.push(new Peer.Lp2pPeer(_pi), lazy)
      } else {
        return this.push(new Peer.ZeroPeer(pi.toString()), lazy)
      }
    }

    if (typeof pi == "string") {
      if (pi.match(/\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+/))
        return this.push(new Peer.ZeroPeer(pi), lazy)

      if (pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+\//) || pi.match(/\/.+\/.+\/.+\/.+\/.+\/.+/)) {
        const id = Id.createFromB58String(pi.split("ipfs/").pop())
        const _pi = new PeerInfo(id)
        _pi.multiaddrs.addSafe(pi)
        return this.push(new Peer.Lp2pPeer(_pi), lazy)
      }
    }

    return false
  }
  addMany(list, zite) {
    if (zite && zite.address) zite = zite.address
    let u = {}
    list.filter(d => u[d] ? false : (u[d] = true)).forEach(p => {
      const peer = this.add(p, true)
      if (zite)
        if (!peer.isSeeding(zite)) peer.seed(zite)
    })
    if (list.length) this.cache.update(this.peers)
  }
  fromJSON(data, cb) {
    data.map(d => Peer.fromJSON(d)).filter(e => !!e).forEach(peer => this.push(peer, true))
    this.cache.update(this.peers)
    cb()
  }
}

module.exports = {
  MainPool,
  ZitePool
}
