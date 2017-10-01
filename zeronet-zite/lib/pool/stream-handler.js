"use strict"

const PeerStream = require("./stream")
const PartStream = require("../file/part-stream")

module.exports = function StreamHandler(zite, _ttl) {
  let peerStream
  let reusableStream = PartStream.reattach()
  let cacheStream = PartStream.cache()
  cacheStream.sink(reusableStream.source)
  let ttl = 0

  function updatePeerStream() {
    if (!peerStream || ttl < new Date().getTime()) {
      peerStream = PeerStream(zite)
      reusableStream.setSource(peerStream)
      ttl = new Date().getTime() + (60 * 1000 || _ttl)
    }
  }

  zite.peerStream = () => {
    updatePeerStream()
    const m = cacheStream.source()
    return function (end, cb) {
      updatePeerStream() //"heartbeat"
      return m(end, cb)
    }
  }
}
