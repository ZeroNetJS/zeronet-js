"use strict"

const assert = require("assert")
const crypto = require("crypto")
const pull = require("pull-stream")
const queue = require("pull-queue")

const fs = require("fs")
const path = require("path")

const debug = require("debug")
const log = debug("zeronet:zite:file-stream")

module.exports = function FileStream(data) {

  let stats
  let info = data
  let cur = 0
  let othersize = 0

  assert(data, "no data given")
  assert(data.site, "no site given")
  assert(data.path, "no path given")
  assert(!(!data.path.endsWith("/content.json") && data.path != "content.json" && !data.hash), "not verifiable")

  let dir = require("../../../../lib/storage-dir")() // hack
  let zite = data.site
  let inner_path = data.path
  let logPath = inner_path + "@" + zite
  let fullPath = path.join(dir, "data", zite, inner_path)

  //TEMP: skip re-downloading if file exists (which totally assumes the file hasn't changed)
  try {
    stats = fs.statSync(fullPath)
    log("File exists", logPath)
  }
  catch (e) { //todo: function call
    log("Getting stream", logPath, info)
    let sendErr = false

    let getStream = queue(function (end, peer, cb) {
      if (end) return cb(end)

      if (sendErr) return cb(sendErr)

      log("try peer", logPath, peer.multiaddr)

      let chunks = []

      function finishLoop(err) {
        if (chunks.length && err) sendErr = err
        if (chunks.length) return cb(null, chunks)
        return cb(err)
      }

      function loop() {
        if (cur >= info.size) return finishLoop(!log("finished", logPath, cur))
        if (!peer.client) return finishLoop() //peer disconnected
        let args = {
          site: data.site,
          location: cur,
          inner_path: data.path,
        }
        if (info.size) args.file_size = info.size
        peer.cmd("getFile", args, function (err, res) {
          if (err) return finishLoop() //goto: next
          if (!res.body.length) {
            if (!info.size) return finishLoop()
            othersize++
            if (othersize == 2) {
              return finishLoop(new Error("Other size"))
            }
            return finishLoop()
          }
          if (!info.size) info.size = res.size
          cur += res.body.length
          log("downloaded", logPath, cur, info.size)
          chunks.push(res.body)
          return loop()
        })
      }
      loop()
    }, {
      sendMany: true
    })

    let verifyStream

    if (info.hash) {
      let vsize = 0
      let vchunks = []
      let vended = false
      let hash = crypto.createHash("sha512")

      verifyStream = queue(function (end, data, cb) {
        //the verify stream queues up the data until the hash matches
        //OR returns an error if hash != validHash and size >= fileSize
        if (end) return cb(end)
        if (vended) return cb(vended)

        vsize += data.length
        vchunks.push(data)
        hash.update(data)

        if (vsize >= info.size && info.size) {
          const finalHash = hash.digest("hex").substr(0, 64) //is truncated to 256bits as "good enough"
          vended = true
          if (finalHash != info.hash) {
            vchunks = null
            return cb(new Error("Hash error " + finalHash + " != " + info.hash))
          } else {
            return cb(null, vchunks)
          }
        } else return cb()
      }, {
        sendMany: true
      })

      pull(
        getStream,
        verifyStream
      )
      return {
        sink: getStream.sink,
        source: verifyStream.source
      }
    } else return getStream
  } //end catch
}
