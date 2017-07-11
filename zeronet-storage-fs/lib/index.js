"use strict"

const fs = require("fs")
const path = require("path")
const mkdirp = require("mkdirp")
const jsonfile = require("jsonfile")

module.exports = function ZeroNetStorageFS(folder) {
  //simple storage provider using the bare filesystem
  //NOTE2SELF: new providers will have "folder" and optional file

  function getPath() {
    const a = [...arguments]
    a.unshift(folder)
    path.join.apply(path, a)
  }

  const self = this

  self.file = {
    //NOTE2SELF: version will be some kind of thing used in updating zites
    exists: (zite, version, inner_path, cb) => fs.exists(getPath(zite, inner_path), res => cb(null, res)),
    read: (zite, version, inner_path, cb) => fs.readFile(getPath(zite, inner_path), cb),
    write: (zite, version, inner_path, cb) => fs.readFile(getPath(zite, inner_path), cb),
    remove: (zite, version, inner_path, cb) => fs.unlink(getPath(zite, inner_path), cb)
  }

  self.json = {
    exists: (key, cb) => fs.exists(getPath("json", key), res => cb(null, res)),
    read: (key, cb) => jsonfile.readFile(getPath("json", key), cb),
    write: (key, cb) => jsonfile.readFile(getPath("json", key), cb),
    remove: (key, cb) => fs.unlink(getPath("json", key), cb)
  }

  self.start = cb => mkdirp(getPath("json"), cb)

  self.stop = cb => cb() //Normally this would unload any dbs

}
