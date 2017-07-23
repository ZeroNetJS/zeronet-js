"use strict"

const crypto = require("crypto")
const debug = require("debug")
const log = debug("zeronet:zite:file-stream")

module.exports = function FileStream(inner_path, pool, site, info) {
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

  const gu = pool.getUntil()
  let cur = 0
  let firstQuery = !info

  function tryGet() {
    gu(peer => {
      const c = peer.client
      c.cmd.getFile({
        site,
        inner_path,
        location: cur
      }, (err, res) => {
        if (err) {
          log.error(err)
          return tryGet()
        } else {
          stream.push(res.body)
          cur += res.body
          if (firstQuery) {

          }
        }
      })
    })
  }

  tryGet()
}
