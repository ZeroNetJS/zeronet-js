"use strict"

const queue = require("pull-queue")
const assert = require("assert")
const debug = require("debug")
const log = debug("zeronet:zite:file-stream")
const pull = require("pull-stream")
const crypto = require("crypto")

module.exports = function FileStream(data) {

  let info = data
  let cur = 0

  assert(data, "no data given")
  assert(data.site, "no site given")
  assert(data.path, "no path given")
  assert(!(!data.path.endsWith("/content.json") && data.path != "content.json" && !data.hash), "not verifiable")

  let dlpath = data.path + "@" + data.site
  let othersize = 0
  //let fullchunk = []

  log("init", dlpath, info)

  let sendErr = false

  let getStream = queue(function (end, peer, cb) {
    if (end) return cb(end)

    if (sendErr) return cb(sendErr)

    log("try peer", dlpath, peer.multiaddr)

    let chunks = []

    function finishLoop(err) {
      if (chunks.length && err) sendErr = err
      if (chunks.length) return cb(null, chunks)
      return cb(err)
    }

    function loop() {
      if (cur >= info.size) return finishLoop(!log("finished", dlpath, cur))
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
            //require("fs").writeFileSync("/tmp/site-failed-download",Buffer.concat(fullchunk))
            return finishLoop(new Error("Other size"))
          }
          return finishLoop()
        }
        if (!info.size) info.size = res.size
        cur += res.body.length
        log("downloaded", dlpath, cur, info.size)
        //fullchunk.push(res.body)
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

    verifyStream = queue(function (end, data, cb) { //the verify stream queues up the data until the hash matches OR returns an error if hash != validHash and size >= fileSize
      if (end) return cb(end)
      if (vended) return cb(vended)

      vsize += data.length
      vchunks.push(data)

      hash.update(data)

      if (vsize >= info.size && info.size) {
        const finalHash = hash.digest("hex").substr(0, 64) //WHY THE FUCK ARE THEY ONLY USING THE FIRST PART OF THE HASH?
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
}
