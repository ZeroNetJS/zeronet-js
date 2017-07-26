"use strict"

const crypto = require("crypto")
const debug = require("debug")
const Readable = require("readable-stream")
const log = debug("zeronet:zite:file-stream")
log.error = debug("zeronet:zite:file-stream:error")

const EE = require("events").EventEmitter
const util = require("util")

function FileStream(inner_path, site, info) {
  const self = this

  let size = 0

  /* Stream init */

  const stream = new Readable({
    read() {

    }
  })
  self.stream = stream

  /* Hash */

  let hashsum

  const hash = crypto.createHash('sha256')
  stream.on("data", data => {
    hash.write(data)
    size += data.length
  })
  stream.on("end", () => {
    hash.on("readable", () => {
      const d = hash.read()
      hashsum = d.toString("hex")
      self.emit("end", null, hashsum, size)
    })
    hash.end()
  })

  let cur = 0
  let firstQuery = !info

  function tryGet_(read) {
    log("init")

    function tryGet(read, peer) { //TODO: refactor to be more competent
      if (self.dead) return read(true)
      if (info && size == info.size) return stream.push(log("downloaded", site, inner_path), read(true))
      log("downloading", site, inner_path, size);
      (peer ? (e, cb) => cb(null, peer) : read)(null, (end, peer) => {
        if (end) return
        const c = peer.client
        c.cmd.getFile({
          site,
          inner_path,
          location: cur
        }, (err, res) => {
          if (self.dead) return
          if (err) {
            log.error("downloading", site, inner_path, err)
            return tryGet(read)
          } else {
            stream.push(res.body)
            size += res.body
            if (firstQuery) {
              info = {
                size: res.size
              }
              firstQuery = false
            }
            return tryGet(read, peer)
          }
        })
      })
    }

    tryGet(read)
  }
  self.tryGet = tryGet_
}

util.inherits(FileStream, EE)

module.exports = FileStream
