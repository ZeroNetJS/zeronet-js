"use strict"

const EE = require("events").EventEmitter

const pull = require("pull-stream")
const paramap = require("pull-paramap")
const cache = require("pull-cache")
const Pushable = require("pull-pushable")
const Queue = require("data-queue")
const once = require("once")

const debug = require("debug")

const sourceStream = require("./source-stream")
const {
  map
} = require("async")

const stream = module.exports = class PeerStream {
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
      sourceStream(this.zite, this.log),
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
    this.cachedSourceStream()
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

module.exports.dialStream = w => pull(
  paramap((peer, cb) => peer.dial(err => cb(err ? false : peer)), w || 5, false),
  pull.filter(val => !!val)
)

module.exports.isOnlineFilter = () => pull.filter(peer => peer.isOnline)

module.exports.roundRobin = (timeout, ...sources) => {
  const src = [...sources].map(src => (end, cb) => {
    cb = once(cb)
    setTimeout(() => cb(new Error("Timeout")), timeout || 1000)
    return src(end, cb)
  }).reverse()

  return (end, cb) => {
    if (end) return map(src, (s, cb) => s(end, () => cb()), cb)
    let tries = 0
    let s_
    const loop = (cb) => {
      const s = s_.pop()
      if (!s) return cb(new Error("Nothing found"))
      s(end, (err, data) => {
        if (err) return loop(cb)
        return cb(err, data)
      })
    }

    const outerLoop = () => {
      tries++
      if (tries === 3) return cb(new Error("Round robin failed"))
      s_ = src.slice(0)
      loop((err, data) => {
        if (err) return outerLoop()
        return cb(err, data)
      })
    }
  }
}

module.exports.getStream = (min) => {
  const q = Queue()
  const e = new EE()
  return {
    sink: read => read(null, function next(end, data) {
      if (end) return q.error(end)
      const err = q.append(data)
      const n = () => err ? read(err, null) : read(null, next)
      if (q.height() < min) n()
      else e.once("get", n)
    }),
    source: (end, cb) => {
      if (end) return q.error(end)
      e.emit("get")
      q.get(cb)
    }
  }
}
