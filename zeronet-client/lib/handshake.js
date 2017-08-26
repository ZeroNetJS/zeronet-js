"use strict"

const msgstream = require("zeronet-client/lib/stream/msgpack")
const handshake = require("zeronet-protocol/lib/proto/handshake")
const util = require("util")
const Bridge = require("zeronet-client/lib/stream/bridge")
const bl = require("bl")
const clientDuplex = require("zeronet-client/lib/duplex")
const EE = require("events").EventEmitter

const pull = require('pull-stream')

const debug = require("debug")

const log = debug("zeronet:protocol:client:handshake")

function HandshakeClient(conn, protocol, zeronet, opt) {
  const self = this

  /* Handling */

  const handlers = self.handlers = {
    handshake: handshake(self, protocol, zeronet, opt)
  }
  let addrs
  conn.getObservedAddrs((e, a) => self.addrs = addrs = (opt.isServer ? "=> " : "<= ") + a.map(a => a.toString()).join(", "))
  log("initializing", addrs)

  function handleIn(data) {
    if (handlers[data.cmd]) handlers[data.cmd].recv(data)
    disconnect(d.end())
  }

  /* Callbacks */

  let cbs = {}

  function addCallback(id, cb) {
    cbs[id] = cb
  }

  function handleResponse(data) {
    if (cbs[data.to]) {
      cbs[data.to](data)
      delete cbs[data.to]
    }
  }

  self.req_id = 0

  self.addCallback = addCallback

  /* CMDS */

  const cmd = self.cmd = {}

  for (var name in handlers)
    cmd[name] = handlers[name].send.bind(handlers[name])

  function disconnect(e) {
    d.end()
    self.emit("end", e)
    self.write = () => {
      throw new Error("Offline")
    }
    self.cmd = {}
  }
  self.disconnect = disconnect

  /* logic */

  const s = Bridge(conn, addrs)

  let d = clientDuplex(addrs, handleIn, handleResponse, disconnect)
  self.write = d.write

  pull(
    s,
    d.u = msgstream.unpack(1),
    d,
    msgstream.pack(),
    s
  )

  /* getRaw */

  self.getRaw = cb => {
    d.u.getChunks().pipe(bl((err, data) => {
      log("appending %s leftover bytes", addrs, data.length)
      if (err) return cb(err)
      cb(null, s.restore([data]))
    }))
  }

  /* upgrade */

  self.upgrade = cb => {
    (opt.isServer ? self.waitForHandshake : self.handshake)((err, handshake, opt) => {
      if (err) return cb(err)
      const _conn = conn
      self.getRaw((err, conn) => {
        if (err) return cb(err)
        conn.getObservedAddrs = _conn.getObservedAddrs
        conn.getPeerInfo = _conn.getPeerInfo
        conn.handshake = handshake
        conn.handshakeOPT = opt
        zeronet.swarm.swarm.protocols["/zn/2.0.0"].handlerFunc(conn, (err, client) => {
          if (err) return cb(err)
          return cb(null, client)
        })
      })
    })
  }

}

util.inherits(HandshakeClient, EE)

module.exports = HandshakeClient
