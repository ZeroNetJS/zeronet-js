"use strict"

function FSMock(store) {
  const self = this
  self.exists = (file, cb) => cb(null, !!store[file])
  self.readFile = (file, cb) => store[file] ? cb(null, store[file]) : cb(new Error("ENOTFOUND: " + file))
  self.writeFile = (file, data, cb) => cb(null, store[file] = data)
  self.unlink = (file, cb) => store[file] ? cb(null, delete store[file]) : cb(new Error("ENOTFOUND: " + file))
}

module.exports = function ZeroNetStorageFS() {
  //store stuff in memory

  const self = this

  let json, file, fs, jfs

  const getPath = (a, b) => a + "/" + b

  self.file = {
    exists: (zite, version, inner_path, cb) => fs.exists(getPath(zite, inner_path), res => cb(null, res)),
    read: (zite, version, inner_path, cb) => fs.readFile(getPath(zite, inner_path), cb),
    write: (zite, version, inner_path, data, cb) => fs.writeFile(getPath(zite, inner_path), data, cb),
    remove: (zite, version, inner_path, cb) => fs.unlink(getPath(zite, inner_path), cb)
  }

  self.json = {
    exists: (key, cb) => jfs.exists(getPath("json", key), res => cb(null, res)),
    read: (key, cb) => jfs.readFile(getPath("json", key), cb),
    write: (key, data, cb) => jfs.writeFile(getPath("json", key), data, cb),
    remove: (key, cb) => jfs.unlink(getPath("json", key), cb)
  }

  self.start = cb => {
    json = {}
    jfs = new FSMock(json)
    file = {}
    fs = new FSMock(json)
    cb()
  }

  self.stop = cb => {
    json = null
    jfs = null
    file = null
    fs = null
    cb()
  }

}
