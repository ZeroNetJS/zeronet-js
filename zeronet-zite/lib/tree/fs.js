"use strict"

const pull = require("pull-stream")
const defer = require("pull-defer")
const tbridge = require("zeronet-client/lib/stream/bridge").through

module.exports = function ZiteFS(zite, storage, tree) {
  const self = this
  self.getFile = (path, cb) => {
    const d = defer.source()
    cb = cb ? cb : (err, stream) => {
      if (err) throw err
      if (stream) d.resolve(stream)
    }
    if (tree.exists(path) || tree.maybeValid(path)) {
      storage.exists(zite.address, 0, path, (err, res /*, ver*/ ) => {
        //TODO: do some version checking
        if (err) return cb(err)
        if (res) {
          cb(null, storage.readStream(zite.address, 0, path))
        } else {
          zite.queue.add({ //TODO: fix for hash, etc
            path
          }, (err, stream) => {
            if (err) return cb(err)
            const b = tbridge()
            pull(
              stream,
              b,
              storage.writeStream(zite.address, 0, path)
            )
            cb(null, b.source)
          })
        }
      })
    } else return cb(new Error("ENOTFOUND: " + path))
    return d
  }
}
