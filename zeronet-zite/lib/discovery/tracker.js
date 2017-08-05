"use strict"

module.exports = function Tracker(zite, node, discovery) {
  const self = this

  self.isAvailable = !!node.trackers.servers.length
  self.tracker = false
  self.start = cb => {
    if (self.tracker) return cb() //already on
    self.tracker = node.trackers.create(zite.address)
    self.tracker.on("peer", p => discovery.emit("peer", p))
    cb()
  }
  self.stop = cb => {
    if (!self.tracker) return cb(new Error("Not running"))
    node.trackers.rm(self.tracker)
    cb()
  }
  self.discover = cb => {
    if (!self.tracker) return cb(new Error("Not running"))
    self.tracker.update()
    cb()
  }
}
