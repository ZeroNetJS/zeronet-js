"use strict"

const each = require("async/each")

module.exports = function Discovery(zite, node, types) {
  const self = this

  self.methods = types.map(t => new t(zite, node)).filter(t => t.isAvailable)
  let isRunning = self.isRunning = false
  self.start = cb => isRunning ? cb(new Error("Already running")) : each(self.methods, (t, cb) => t.start(cb), cb)
  self.stop = cb => !isRunning ? cb(new Error("Not running")) : each(self.methods, (t, cb) => t.stop(cb), cb)
  self.discover = cb => !isRunning ? cb(new Error("Not running")) : each(self.methods, (t, cb) => t.discover(cb), cb)
}
