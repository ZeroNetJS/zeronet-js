"use strict"

const FileStream = require("zeronet-zite/lib/file-stream")
const PeerStream = require("zeronet-zite/lib/pool/stream")
const debug = require("debug")
const log = debug("zeronet:zite:queue")
const uuid = require("uuid")
const EE = require("events").EventEmitter
const util = require("util")

function ItemInQueue(queue, zite, zeronet, item, initCB) {
  const self = this

  self.id = uuid()
  if (typeof item == "string" && !item.endsWith("/content.json") && item != "content.json") initCB(new Error("SecurityError: File is not self-validating and no hash given"))
  if (typeof item == "string") item = {
    path: item,
    grab: true //will get size prop from first peer
  }

  let dead = false

  log("new job", zite.address, item)

  const stream = self.stream = new FileStream(item.path, zite.address, item.size)

  const cb = function () {
    let a = [...arguments]
    a.unshift("done")
    self.emit.apply(self, a)
  }

  PeerStream(zite, zeronet, stream.tryGet)
  setTimeout(() => {
    //context deadline exceeded (aka nobody got this file)
    stream.dead = true
    dead = true
    cb(new Error("Context deadline exceeded"))
  }, 100 * 1000)

  stream.once("end", (err, hash, size) => {
    if (err) return cb(err)
    if ((item.hash && item.hash != hash) || (item.size && item.size != size)) return cb(new Error("Missmatch: " + zite.address + "/" + item.path + " " + " valid/got Size: " + item.size + "/" + size + " Hash: " + item.hash + "/" + hash), log("Missmatch: " + zite.address + "/" + item.path + " " + " valid/got Size: " + item.size + "/" + size + " Hash: " + item.hash + "/" + hash))
  })

  initCB(null, stream)

}

util.inherits(ItemInQueue, EE)

module.exports = function Queue(zite, zeronet) {
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

  self.add = (info, initCB, cb) => {
    let url
    if (typeof info == "string") url = info
    else url = info.path
    if (self.inQueue(url)) {
      const item = get(url)
      item.once("done", cb)
      initCB(null, item.stream)
    }
    if (tree.exists(url) || tree.maybeValid(url)) {
      const item = new ItemInQueue(self, zite, zeronet, info, initCB, err => {
        if (err) log("job", zite.address, url, "failed", err)
        items.filter(i => i.id != item.id)
      })
      items.push(item)
      queue[url] = item
      item.once("done", cb)
    } else initCB(new Error("ENOTFOUND: " + url))
  }
}
