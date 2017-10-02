"use strict"

const PeerStream = require("./stream")
const PartStream = require("../file/part-stream")
const DataCache = PartStream.data_cache
const defer = require('pull-defer/source')
const EE = require("events").EventEmitter

function PeerCache() {
  let cache
  const ee = new EE()
  return {
    sink: function (read) {
      cache = DataCache(cb => read(null, cb), err => read(err, () => {}))
      ee.emit("cache.ready")
    },
    source: function createSource() {
      const defsrc = defer()

      function gloop() {
        const getter = cache.createGetter()
        let list = {}
        defsrc.resolve(function (end, cb) {
          if (end) return cb(end)

          function get() {
            getter((err, res) => {
              if (err) {
                list = null
                return cb(err, res)
              }
              if (!res.isOnline) return get()
              if (list[res.id]) return get()
              list[res.id] = true
              return cb(err, res)
            })
          }

          get()
        })
      }
      if (cache) gloop()
      else ee.once("cache.ready", gloop)
      return defsrc
    },
    stop: e => cache.stop(e)
  }
}

module.exports = function StreamHandler(zite, _ttl) {
  let peerStream
  let reusableStream = PartStream.reattach()
  let cacheStream = PeerCache()
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
