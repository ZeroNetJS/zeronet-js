"use strict"

const NAT = require("./nat")
const multiaddr = require("multiaddr")

const once = require("once")
const each = require("async/each")
const series = require("async/series")
const parallel = require('async/parallel')

function createListeners(transport, ma, handler) {
  return dialables(transport, ma).map((ma) => {
    return (cb) => {
      const done = once(cb)
      const listener = transport.createListener(handler)
      listener.once('error', done)

      listener.listen(ma, (err) => {
        if (err) {
          return done(err)
        }
        listener.removeListener('error', done)
        transport.listeners.push(listener)
      })
    }
  })
}

function closeListeners(transport, callback) {
  parallel(transport.listeners.map((listener) => {
    return (cb) => {
      listener.close(cb)
    }
  }), callback)
}

//ZNv2 swarm using libp2p-transports

function dialables(tp, multiaddrs) {
  return tp.filter(multiaddrs)
}

function ZNV2Swarm(opt, protocol) {
  const self = this

  const tr = self.transport = {}
  const ma = self.multiaddrs = opt.listen.map(m => multiaddr(m))

  opt.transports.forEach(transport => {
    tr[transport.tag || transport.constructor.name] = transport
    if (!transport.listeners)
      transport.listeners = []
  })

  function listen(cb) {
    each(Object.keys(tr), (t, next) =>
      parallel(createListeners(tr[t], ma, protocol.upgradeConnZNV2({
        isServer: true
      })), next), cb)
  }

  function unlisten(cb) {
    each(Object.keys(tr), (t, next) =>
      parallel(closeListeners(tr[t]), next), cb)
  }

  self.advertise = {
    ip: null,
    port: null,
    port_open: null
  }

  let nat
  if (opt.nat) nat = self.nat = new NAT(self, opt)

  self.start = cb => series([
    listen,
    nat ? nat.doDefault : cb => cb()
  ], cb)
  self.stop = cb => series([
    unlisten
  ], cb)
}
module.exports = ZNV2Swarm
