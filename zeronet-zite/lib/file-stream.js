"use strict"

const crypto = require("crypto")
const debug = require("debug")
const log = debug("zeronet:zite:file-stream")
log.error = debug("zeronet:zite:file-stream:error")

module.exports = function FileStream(gu, inner_path, site, info) {
  const stream = {}
  const hash = crypto.createHash('sha256')
  const self = this
  let hashsum
  let size = 0
  let endReg = []
  stream.on("data", data => {
    hash.write(data)
    size += data.length
  })
  stream.on("end", () => {
    hash.on("readable", () => {
      const d = hash.read()
      hashsum = d.toString("hex")
      endReg.forEach(cb => cb(null, hashsum, size))
    })
    hash.end()
  })
  self.registerEnd = cb => {
    endReg.push(cb)
  }
  self.stream = stream

  let cur = 0
  let firstQuery = !info

  function tryGet() {
    if (self.dead) return
    if (info && size == info.size) return stream.end(log("downloaded", site, inner_path))
    log("downloading", site, inner_path, size)
    gu(peer => {
      const c = peer.client
      c.cmd.getFile({
        site,
        inner_path,
        location: cur
      }, (err, res) => {
        if (self.dead) return
        if (err) {
          log.error("downloading", site, inner_path, err)
          return tryGet()
        } else {
          stream.push(res.body)
          cur += res.body
          if (firstQuery) {
            info = {
              size: res.size
            }
          }
          return tryGet()
        }
      })
    })
  }

  tryGet()
}
