"use strict"

module.exports = function ZiteFS(zite, storage, tree) {
  const self = this
  self.getFile = (path, cb) => {
    if (tree.exists(path) || tree.maybeValid(path)) {
      storage.exists(zite.address, 0, path, (err, res /*, ver*/ ) => {
        //TODO: do some version checking
        if (err) return cb(err)
        if (res) {
          cb(null, storage.readStream(zite.address, 0, path))
        } else {
          zite.queue.add({ //TODO: fix for hash, etc
            path
          }, cb)
        }
      })
    } else return cb(new Error("ENOTFOUND: " + path))
  }
}
