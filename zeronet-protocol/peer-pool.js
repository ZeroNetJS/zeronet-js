"use strict"

const hypercache = require("hypercache")

const Peer = require("./zeronet-peer")

const each = require("async/each")

const debug = require("debug")
const log = debug("zeronet:peer-pool")
log.error = debug("zeronet:peer-pool:error")

module.exports = function PeerPool() {
  const self = this

  const cache = new hypercache(null, {
    name: "peers",
    keys: ["addr", "id", "multiaddr"],
    sets: ["zites"],
    manual: true
  })

  let peers = []

  function isInList(peerLike) {
    return cache.search(peerLike.toString())
  }

  function update() {
    log("update cache")
    cache.update(peers)
  }

  function add(peerLike, zite, cb) {
    if (isInList(peerLike)) return cb(null, isInList(peerLike))
    Peer.fromAddr(peerLike, (err, peer) => {
      log("added", peer.multiaddr)
      update()
      if (err) return cb(err)
    })
  }

  function addMany(list, cb) {
    if (!Array.isArray(list)) list = [list]
    log("adding", list.length)
    each(list, (addr, next) => {
      add(addr, err => {
        if (err) log.error(err)
        return next()
      })
    }, cb ? cb : () => {})
  }

  function getAll() {
    return cache.getAll()
  }

  function getZite(zite) {
    return cache.getSet("zites", zite)
  }

  self.add = add
  self.addMany = addMany
  self.getAll = getAll
  self.getZite = getZite
  self.cache = cache
}
