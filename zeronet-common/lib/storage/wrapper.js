const pull = require("pull-stream")
const queue = require("pull-queue")

module.exports = function StorageWrapper(storage) {
  const self = this

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
    pull(
      pull.values(Array.isArray(path) ? path : [path]),
      queue(function (end, file, cb) {
        if (end) return cb(end)
        storage.file.read(zite, v, path, cb)
      })
    )
  }
}
