"use strict"

const FileStream = require("zeronet-zite/lib/file-stream")

function ItemInQueue(queue, zite, item, initCB, cb) {
  const pool = zite.pool
  if (typeof item == "string" && !item.endsWith("/content.json") && item != "content.json") throw new Error("SecurityError: File is not self-validating and no hash given")
  if (typeof item == "string") item = {
    path: item,
    grab: true //will get size prop from first peer
  }
  const nextPeer = pool.getUntil()
  let dead = false
  const stream = new FileStream(nextPeer, item.path, zite.address, item.size)
  setTimeout(() => {
    //context deadline exceeded (aka nobody got this file)
    stream.dead = true
    dead = true
    cb(new Error("Context deadline exceeded"))
  }, 10 * 1000)
  stream.registerEnd((err, hash, size) => {
    if (err) return cb(err)
    if (item.hash != hash || (item.size && item.size != size)) return cb(new Error("Missmatch: " + zite + "/" + item.path + " " + " valid/got Size: " + item.size + "/" + size + " Hash: " + item.hash + "/" + hash))
  })
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

  self.add = (info, initCB, cb) => {
    let url
    if (typeof info == "string") url = info
    else url = info.path
    if (self.inQueue(url)) return get(url)
    if (tree.exists(url) || tree.maybeValid(url)) {
      const item = new ItemInQueue(self, zite, info, initCB, cb)
      items.push(item)
      queue[url] = item
    }
  }
}
