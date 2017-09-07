"use strict"

const each = require("async/each")

const EE = require('events').EventEmitter
const util = require("util")
const debug = require("debug")
const log = debug("zeronet:zite:discovery")

function Discovery(zite, node, types) {
  /**
    @namespace Discovery
    @constructor
    */
  const self = this

  let discovering = false
  let queuedDiscover = false
  let lastDiscover = 0

  self.methods = types.map(t => new t(zite, node, self)).filter(t => t.isAvailable)
  let isRunning = self.isRunning = false
  self.start = cb => isRunning ? cb(new Error("Already running")) : each(self.methods, (t, cb) => t.start(cb), err => err ? cb(err) : cb(null, isRunning = true))
  self.stop = cb => !isRunning ? cb(new Error("Not running")) : each(self.methods, (t, cb) => t.stop(cb), err => err ? cb(err) : cb(null, isRunning = false))
  self.discover = () => {
    if (!isRunning) throw new Error("Not running")
    if (discovering) return (queuedDiscover = true) && log("queued discover")
    if (lastDiscover + 10 * 1000 > new Date().getTime()) {
      discovering = true
      log("paused discover for %s ms", lastDiscover + 10 * 1000 - new Date().getTime())
      setTimeout(self.discover, lastDiscover + 10 * 1000 - new Date().getTime())
    }
    log("discovery")
    each(self.methods, (t, cb) => t.discover(cb), err => {
      if (err) log(err)
      discovering = false
      if (queuedDiscover) {
        queuedDiscover = false
        log("executing queued discovery")
        self.discover()
      }
    })
  }
  self.peer = addr => {
    const peer = node.peerPool.add(addr)
    if (!peer.isSeeding(zite.address)) peer.seed(zite.address)
  }
}

util.inherits(Discovery, EE)

module.exports = Discovery
