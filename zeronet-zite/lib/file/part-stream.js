"use strict"

const EE = require("events").EventEmitter
const uuid = require("uuid")
const defer = require('pull-defer/source')

function DataCache(requestFnc) {
  const ee = new EE()
  let q = []
  let err
  let h = 0

  function gloop() {
    ee.once("get." + h, () => {
      requestFnc((e, r) => {
        ee.emit("got." + h, e, r)
        err = e
        h++
        gloop()
      })
    })
  }
  gloop()

  return {
    createGetter: () => {
      const getter = cb => {
        if (q.length > getter.height) //if 1>0 return cb(null, queue[0++])
          return cb(null, q[getter.height++])
        else if (err) { //this is called after the data is sent so new getters don't skip the data
          return cb(err)
        } else {
          ee.emit("get." + getter.height)
          ee.once("got." + getter.height, (e, r) => {
            getter.height++
              return cb(e, r)
          })
        }
      }
      getter.id = uuid()
      getter.height = 0
      return getter
    }
  }
}

module.exports.data_cache = DataCache
module.exports.cache = function Cache() {
  let cache
  const ee = new EE()
  return {
    sink: function (read) {
      cache = DataCache(cb => read(null, cb))
      ee.emit("cache.ready")
    },
    source: function createSource() {
      const defsrc = defer()

      function gloop() {
        const getter = cache.createGetter()
        defsrc.resolve(function (end, cb) {
          if (end) return cb(end)
          getter(cb)
        })
      }
      if (cache) gloop()
      else ee.once("cache.ready", gloop)
      return defsrc
    }
  }
}

module.exports.reattach = function Reattachable() {
  const ee = new EE()
  let src
  return {
    source: function src_(end, cb) {
      function gloop() {
        src(end, cb)
      }
      if (src) gloop()
      else ee.once("source.change", gloop)
    },
    setSource: s => {
      src = s
      ee.emit("source.change")
    }
  }
}
