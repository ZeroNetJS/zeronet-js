"use strict"

const EventEmitter = require("events").EventEmitter
const debug = require("debug")
const log = process.env.INTENSE_DEBUG ? debug("zeronet:pool:getters") : () => {}

class Getter extends EventEmitter {
  constructor(pool) {
    super()
    this.peers = []
    this.pool = pool
    this.register = () => {
      log("register %s to %s", this.id || this.tag || "<unknown>", pool.zite || "<main>")
      pool.registerGetter(this)
      delete this.register
    }
  }
  _push(peer) {
    this.peers.push(peer)
    log("adding peer %s to getter:%s", peer.id, this.id || this.tag || "<unknown>")
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
  registerGetter(get) {
    this.peers.forEach(p => get.push(p))
    this.on("peer", p => get.push(p))
  }
}

class OnlineGetter extends Getter {
  constructor(pool) {
    super(pool)
    this.tag = "online"
    this.register()
  }
  push(peer) {
    if (peer.isOnline) {
      this._push(peer)
    }
  }
}

class OfflineGetter extends Getter {
  constructor(pool) {
    super(pool)
    this.tag = "offline"
    this.register()
  }
  push(peer) {
    if (!peer.isOnline) {
      this._push(peer)
    }
  }
}

class DiscoveryCandidateGetter extends Getter {
  constructor(pool, addr) {
    super(pool)
    this.tag = "discovery"
    this.zite = addr
    this.register()
  }
  push(peer) {
    if (!peer.ip && !peer.isSeeding(this.zite) && peer.isOnline) this._push(peer)
  }
}

class MetaGetter extends EventEmitter {
  constructor(getters) {
    super()
    this.glist = getters
    this.gobj = {}
    getters.forEach(g => {
      g.id = g.tag || g.constructor.name
      this.gobj[g.id] = g
      g.on("peer", peer => this.emit("peer", g.id, peer))
    })
  }
  get(cb) {
    const f = this.glist.filter(g => g.peers.length)[0]
    if (f) {
      cb(null, f.id, f.peers.shift())
    } else {
      this.once("peer", id =>
        cb(null, id, this.gobj[id].peers.shift()))
    }
  }
  getSync() {
    const f = this.glist.filter(g => g.peers.length)[0]
    if (f) {
      return [f.id, f.peers.shift()]
    } else {
      return false
    }
  }
  get peers() {
    return this.glist.filter(g => g.peers.length).length
  }
}

module.exports = {
  Getter,
  OnlineGetter,
  OfflineGetter,
  DiscoveryCandidateGetter,
  MetaGetter
}
