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
    return path.join.apply(path, a)
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
    read: (key, cb, ig) => {
      jsonfile.readFile(getPath("json", key), (Err, data) => {
        if (Err && ig) return cb(Err)
        if (Err) {
          self.json.exists(key + ".bak", (err, res) => { //backup exists. something happend.
            if (err) return cb(err)
            if (res) {
              self.json.exists(key, (err, res2) => {
                if (err) return cb(err)
                if (res2) { //orig file exists too - corrupt
                  console.warn("STORAGE WARNGING: JSON FILE %s POTENTIALLY GOT CORRUPTED! CREATING BACKUP %s!", getPath("json", key), getPath("json", key + ".corrupt"))
                  fs.rename(getPath("json", key), getPath("json", key + ".corrupt"), err => {
                    if (err) return cb(err)
                    self.json.read(key + ".bak", (err, data) => {
                      if (err) {
                        console.warn("UNRECOVEREABLE!")
                        return cb(err)
                      } else {
                        console.warn("READING BACKUP %s SUCCEDED!", getPath("json", key + ".bak"))
                        return cb(null, data)
                      }
                    }, true)
                  })
                } else { //just didn't rename
                  fs.rename(getPath("json", key + ".bak"), getPath("json", key), err => {
                    if (err) return cb(err)
                    self.json.read(key, cb)
                  })
                }
              })
            } else return cb(Err) //just ENOTFOUND or permissions
          })
        } else return cb(null, data)
      })
    },
    write: (key, data, cb) => {
      jsonfile.writeFile(getPath("json", key + ".bak"), data, err => {
        if (err) return cb(err)
        fs.unlink(getPath("json", key), err => {
          if (err) return cb(err)
          fs.rename(getPath("json", key + ".bak"), getPath("json", key), cb)
        })
      })
    },
    remove: (key, cb) => fs.unlink(getPath("json", key), cb)
  }

  self.start = cb => mkdirp(getPath("json"), cb)

  self.stop = cb => cb() //Normally this would unload any dbs

}
