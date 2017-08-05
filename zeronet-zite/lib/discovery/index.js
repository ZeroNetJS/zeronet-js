"use strict"

const each = require("async/each")

const EE = require('events').EventEmitter
const util = require("util")

function Discovery(zite, node, types) {
  const self = this

  self.methods = types.map(t => new t(zite, node, self)).filter(t => t.isAvailable)
  let isRunning = self.isRunning = false
  self.start = cb => isRunning ? cb(new Error("Already running")) : each(self.methods, (t, cb) => t.start(cb), err => err ? cb(err) : cb(null, isRunning = true))
  self.stop = cb => !isRunning ? cb(new Error("Not running")) : each(self.methods, (t, cb) => t.stop(cb), err => err ? cb(err) : cb(null, isRunning = false))
  self.discover = cb => !isRunning ? cb(new Error("Not running")) : each(self.methods, (t, cb) => t.discover(cb), cb)
}

util.inherits(Discovery, EE)

module.exports = Discovery
