"use strict"

const pull = require("pull-stream")
const cache = require("pull-cache")

const debug = require("debug")

const sourceStream = require("./source-stream")
const stream = require("./util")

module.exports = class PeerStream {
  constructor(zite) {
    this.address = zite.address
    this.zite = zite
    const log = this.log = process.env.INTENSE_DEBUG ? debug("zeronet:zite:peer-stream:zite:" + zite.address) : () => {}

    zite.peerStream = this.peerStream.bind(this)
    zite.peerStream.stream = this

    log("creating")
  }

  createSourceStream(hasGetter) {
    return pull(
      sourceStream(this.zite),
      stream.dialStream(),
      hasGetter ? stream.getStream(5) : pull.map(d => d)
    )
  }

  cachedSourceStream() {
    const cacher = pull(
      this.cachedSource ? this.cachedSource : (this.cachedSource = this.createSourceStream(true)),
      cache
    )
    return () => pull(
      cacher(),
      stream.isOnlineFilter()
    )
  }

  peerStream() {
    /*return pull( //TODO: fix structure and add this
      stream.roundRobin(1000, this.getCachedSource(), this.createSourceStream())
    )*/
    pull( //TODO: debug
      this.createSourceStream(),
      pull.log()
    )
    return pull.values([])
  }
}

/*

  Structure:
    - roundRobin: Round robin stream with timeout
      ⁻ filterCacheStream: Reads from a cache and returns peers that are still online
        - getStream: Gets peers until cache reaches N peers
          - sourceStream: The stream where fresh peers come from
            - roundRobin
              - sourceStream: Discovers new peers
                - from zero discovery: peers from the trackers, etc. that we know have the zite
                - from lp2p discovery: peers we don't know the zites. low priorty, fallback
            - dialStream: Dials new peers to test if they are online
        - cacheStream: Caches all peers
      - sourceStream: See roundRobin -> filterCacheStream -> getStream

*/
