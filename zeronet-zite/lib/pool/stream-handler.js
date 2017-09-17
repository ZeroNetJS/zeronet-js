"use strict"

const PeerStream = require("./stream")
const PartStream = require("../file/part-stream")

module.exports = function StreamHandler(zite, _ttl) {
  let peerStream, cacheStream
  let reusableStream = PartStream.reattach()
  let multiplexerStream = PartStream.multiplexer(reusableStream.source)
  let ttl = 0

  function updatePeerStream() {
    if (!peerStream || ttl < new Date().getTime()) {
      peerStream = PeerStream(zite)
      cacheStream = PartStream.cache()
      cacheStream.sink(peerStream.source)
      reusableStream.setSource(cacheStream.source)
      ttl = new Date().getTime() + (60 * 1000 || _ttl)
    }
  }

  zite.peerStream = () => {
    updatePeerStream()
    return multiplexerStream()
  }
}
