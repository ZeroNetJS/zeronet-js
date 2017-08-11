"use strict"

const fs = require("fs")
const path = require("path")
const mkdirp = require("mkdirp")
const jsonfile = require("jsonfile")
const series = require("async/series")
const waterfall = require("async/waterfall")

const toPull = require("stream-to-pull-stream")

/**
 * Bare filesystem storage for ZeroNetJS
 * @param {string} folder - directory to store files
 * @namespace StorageFS
 * @constructor
 */
module.exports = function ZeroNetStorageFS(folder) {
  //simple storage provider using the bare filesystem
  //NOTE2SELF: new providers will have "folder" and optional file

  /**
   * @param {...string} arguments - List of strings to join with the root folder using path.json
   * @private
   */
  function getPath() {
    const a = [...arguments]
    a.unshift(folder)
    return path.join.apply(path, a)
  }

  const self = this

  self.file = {
    //NOTE2SELF: version will be some kind of thing used in updating zites
    /**
     * @param {string} zite - Address of the zite
     * @param {integer} version - Version/Timestamp of the file
     * @param {string} inner_path - Path of the file relative to the zite
     * @param {callback} - `err`: the filesystem error, `exists`: if the file exists
     */
    exists: (zite, version, inner_path, cb) => fs.exists(getPath(zite, inner_path), res => cb(null, res)),
    /**
     * @param {string} zite - Address of the zite
     * @param {integer} version - Version/Timestamp of the file
     * @param {string} inner_path - Path of the file relative to the zite
     * @param {callback} - `err`: the filesystem error, `data`: the data of the file as buffer
     */
    read: (zite, version, inner_path, cb) => fs.readFile(getPath(zite, inner_path), cb),
    /**
     * @param {string} zite - Address of the zite
     * @param {integer} version - Version/Timestamp of the file
     * @param {string} inner_path - Path of the file relative to the zite
     * @param {data} data - The data to be written
     * @param {callback} - `err`: the filesystem error
     */
    write: (zite, version, inner_path, data, cb) => series([
      cb => mkdirp(path.dirname(getPath(zite, inner_path)), cb),
      cb => fs.writeFile(getPath(zite, inner_path), data, cb)
    ], cb),
    /**
     * @param {string} zite - Address of the zite
     * @param {integer} version - Version/Timestamp of the file
     * @param {string} inner_path - Path of the file relative to the zite
     * @param {data} data - The data to be written
     * @param {callback} - `err`: the filesystem error
     */
    remove: (zite, version, inner_path, cb) => fs.unlink(getPath(zite, inner_path), cb),
    /**
     * NOTE: the function will return an error if the file does not exist
     * @param {string} zite - Address of the zite
     * @param {integer} version - Version/Timestamp of the file
     * @param {string} inner_path - Path of the file relative to the zite
     * @param {callback} - `err`: the filesystem error, 'stream': the read stream
     */
    readStream: (zite, version, inner_path, cb) => {
      try {
        cb(null, toPull.source(fs.createReadStream(getPath(zite, inner_path))))
      } catch (e) {
        cb(e)
      }
    },
    /**
     * NOTE: the function will return an error if the file does not exist
     * @param {string} zite - Address of the zite
     * @param {integer} version - Version/Timestamp of the file
     * @param {string} inner_path - Path of the file relative to the zite
     * @param {callback} - `err`: the filesystem error, 'stream': the write stream
     */
    writeStream: (zite, version, inner_path, cb) => waterfall([
      cb => mkdirp(path.dirname(getPath(zite, inner_path)), cb),
      cb => cb(toPull.sink(fs.createWriteStream(getPath(zite, inner_path))))
    ], cb)
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
                        self.json.write(key, data, err => {
                          if (err) return cb(err)
                          cb(null, data)
                        })
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
      series([
        cb => self.json.exists(getPath("json", key + ".bak"), (err, res) => {
          if (err) return cb(err)
          if (res) fs.unlink(getPath("json", key + ".bak"), cb)
          else cb()
        }),
        cb => self.json.exists(getPath("json", key), (err, res) => {
          if (err) return cb(err)
          if (res) fs.rename(getPath("json", key), getPath("json", key + ".bak"), cb)
          else cb()
        }),
        cb => jsonfile.writeFile(getPath("json", key), data, cb)
      ], cb)
    },
    remove: (key, cb) => fs.unlink(getPath("json", key), cb)
  }

  self.start = cb => mkdirp(getPath("json"), cb)

  self.stop = cb => cb() //Normally this would unload any dbs

}
