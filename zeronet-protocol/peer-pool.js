"use strict"

const hypercache = require("hypercache")

const multiaddr = require("multiaddr")
const Id = require("peer-id")
const peerInfo = require("peer-info")

const Peer = require("./zeronet-peer")

const each = require("async/each")

const debug = require("debug")
const log = debug("zeronet:peer-pool")
log.error = debug("zeronet:peer-pool:error")

module.exports = function PeerPool() {
  const cache = new hypercache(null, {
    name: "peers",
    keys: ["addr", "id", "multiaddr"],
    //sets: ["zites"], - for non-unique. get prop from object and either concat or append to set
    manual: true
  })

  let peers = []

  function isInList(peerLike) {
    return cache.search(peerLike.toString())
  }

  function update() {
    cache.update(peers)
  }

  function add(peerLike, zite, cb) {
    if (isInList(peerLike)) return cb(null, isInList(peerLike))
    Peer.fromAddr(peerLike, (err, peer) => {
      log("added", peer.multiaddr)
      if (err) return cb(err)
    })
  }

  function addBunch(list, cb) {
    log("adding", list.length)
    each(list, (addr, next) => {
      add(addr, err => {
        if (err) log.error(err)
        return next()
      })
    }, cb ? cb : () => {})
  }
}
