"use strict"

const pull = require("pull-stream")
const Getters = require("zeronet-common/lib/peer/pool-getters")
const stream = require("./util")
const paramap = require("pull-paramap")

const getter2stream = getters => {
  const getter = new Getters.MetaGetter(getters)
  return (end, cb) => {
    if (end) {
      getter.stop()
      return cb(end)
    }
    getter.get((err, id, peer) => {
      return cb(err, peer)
    })
  }
}

const discoveryCandidateGetter = zite => getter2stream([new Getters.DiscoveryCandidateGetter(zite.pool.main, zite.address)])
const offlineGetter = zite => getter2stream([new Getters.OfflineGetter(zite.pool)])
const onlineGetter = zite => pull(
  getter2stream([new Getters.OnlineGetter(zite.pool)]),
  stream.isOnlineFilter()
)

const discovery = zite => pull(
  discoveryCandidateGetter(zite),
  stream.dialStream(),
  paramap((peer, cb) => {
    peer.discoveryZite(zite.address, res => cb(null, [peer, res]))
  }, 5, false),
  pull.filter(p => p[1]),
  pull.map(p => p[0])
)

const onlinePeers = zite => onlineGetter(zite)
const offlinePeers = zite => stream.roundRobin(100, offlineGetter(zite), discovery(zite))

module.exports = zite => {
  zite.discovery.discover()
  return stream.roundRobin(100, onlinePeers(zite), offlinePeers(zite), () => zite.discovery.discover())
}
