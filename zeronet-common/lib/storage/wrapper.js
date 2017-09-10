"use strict"

const pull = require("pull-stream")
const defer = require("pull-defer")

module.exports = function StorageWrapper(storage) {
  const self = this
  self.storage = storage

  /* start/stop */

  self.start = storage.start
  self.stop = storage.stop

  /* json */

  self.getJSON = (key, def, cb) => {
    storage.json.exists(key, (err, res) => {
      if (err) return cb(err)
      if (res)
        storage.json.read(key, cb)
      else
        return cb(null, def)
    })
  }
  self.setJSON = storage.json.write

  /* files */

  self.exists = storage.file.exists
  self.readStream = (zite, v, path) => {
    if (storage.file.readStream) {
      const d = defer.source()
      storage.file.readStream(zite, v, path, (err, stream) => {
        if (err) return d.resolve(pull.error(err))
        d.resolve(stream)
      })
      return d
    } else {
      const d = defer.source()
      storage.file.read(zite, v, path, (err, res) => {
        if (err) d.resolve(pull.error(err))
        else d.resolve(pull.values([res]))
      })
      return d
    }
  }
  self.writeStream = (zite, v, path) => {
    if (storage.file.writeStream) {
      const d = defer.sink()
      storage.file.writeStream(zite, v, path, (err, stream) => {
        if (err) d.resolve(pull.error(err))
        d.resolve(stream)
      })
      return d
    } else {
      return pull.collect((err, chunks) => {
        if (err) return console.error(err)
        storage.file.write(zite, v, path, Buffer.concat(chunks), () => {})
      })
    }
  }
}
