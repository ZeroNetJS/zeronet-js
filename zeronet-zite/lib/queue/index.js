"use strict"

//const cache = require("pull-cache")
const pull = require("pull-stream")
//const queue = require("pull-queue")

const FileStream = require("zeronet-zite/lib/file/stream")
const PeerStream = require("zeronet-zite/lib/pool/stream")

function QueueItem(zite, info) {
  info.site = zite.address
  return pull(
    PeerStream(zite),
    FileStream(info)
    //cache TODO: fix caching
  )
}

module.exports = function Queue(zite) {
  const self = this
  const tree = zite.tree

  let queue = {}
  let items = []

  function get(url) {
    return queue[url]
  }

  self.inQueue = url => !!get(url)

  self.start = cb => cb() //TODO: add
  self.stop = cb => cb() //TODO: add

  self.add = (info, cb) => {
    let url
    if (typeof info == "string") url = info
    else url = info.path
    if (self.inQueue(url)) return cb(null, get(url))
    if (tree.exists(url) || tree.maybeValid(url)) {
      const item = QueueItem(zite, info)
      queue[url] = item
      items.push(item)
      cb(null, item)
    } else cb(new Error("ENOTFOUND: " + url))
  }
}
