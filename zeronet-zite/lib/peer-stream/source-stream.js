"use strict"

module.exports = PeerList

const Getters = require("zeronet-common/lib/peer/pool-getters")

//TODO: refactor into 2 seperate pull-streams and do round-robin get w/ tiny timeout

function PeerList(zite, log) { //gets peers
  const getter = new Getters.MetaGetter([new Getters.OnlineGetter(zite.pool), new Getters.OfflineGetter(zite.pool)])
  const dgetter = new Getters.MetaGetter([new Getters.DiscoveryCandidateGetter(zite.pool.main, zite.address)])
  let last0 = false
  let failedDiscovery = 0
  return function (end, cb) {
    if (end) return cb(end)
    log("peer:list:out read")

    if (!last0) failedDiscovery = 0
    last0 = false

    function getLoop() {
      if (failedDiscovery >= 3) return cb(new Error("PeerList drained"))
      if (getter.peers) {
        if (getter.peers <= 5) zite.discovery.discover() //low peers
        const peer_ = getter.getSync()
        const peer = peer_.pop()
        const type = peer_.pop()
        log("peer:list:out got a %s peer", type)
        cb(null, peer)
      } else {
        if (dgetter.peers) {
          log("peer:list:out discovery method")
          zite.discovery.discover() //get non-discovery peers
          const peer = dgetter.getSync().pop()
          peer.discoverZite(zite.address, res => {
            if (res) {
              log("peer:list:out discovered a peer")
              return cb(null, peer)
            } else {
              last0 = true
              failedDiscovery += 0.1
              log("peer:list:out discovery method fail (f = %s)", failedDiscovery)
              return getLoop()
            }
          })
        } else {
          log("peer:list:out drained. discover (f = %s)", failedDiscovery)
          last0 = true
          failedDiscovery += 1
          zite.discovery.discoverCB(() => {
            process.nextTick(getLoop)
          })
        }
      }
    }
    getLoop()
  }
}
