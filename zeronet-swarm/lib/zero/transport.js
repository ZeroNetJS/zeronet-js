"use strict"

const once = require("once")
const each = require("async/each")
const parallel = require('async/parallel')

function dialables(tp, multiaddrs) {
  return tp.filter(multiaddrs)
}

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
        done()
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

module.exports = function ZeroSwarmTransport(swarm) {
  const self = swarm
  const tr = self.transport

  function listen(cb) {
    each(Object.keys(tr), (t, next) =>
      parallel(createListeners(tr[t], self.multiaddrs, self.proto.upgradeConn({
        isServer: true
      })), next), cb)
  }

  function unlisten(cb) {
    each(Object.keys(tr), (t, next) =>
      parallel(closeListeners(tr[t]), next), cb)
  }

  self.listen = listen
  self.unlisten = unlisten
}
