"use strict"

const msgstream = require("zeronet-protocol/lib/stream/msgpack")
const util = require("util")
const Bridge = require("zeronet-protocol/lib/stream/bridge")
const clientDuplex = require("zeronet-protocol/lib/client/duplex")
const EE = require("events").EventEmitter

const pull = require('pull-stream')

const debug = require("debug")

const log = debug("zeronet:protocol:client")

function Client(conn, protocol, zeronet, opt) {
  const self = this

  /* Handling */

  const handlers = self.handlers = protocol.getHandlers(self)
  self.handshakeData = opt.handshake
  self.conn = conn

  let addrs
  conn.getObservedAddrs((e, a) => self.addrs = addrs = (opt.isServer ? "=> " : "<= ") + a.map(a => a.toString()).join(", "))
  log("initializing", addrs)

  function handleIn(data) {
    if (handlers[data.cmd]) handlers[data.cmd].recv(data)
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

  self.req_id = 1 //used the first for handshake

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
    msgstream.unpack(),
    d,
    msgstream.pack(),
    s
  )

}

util.inherits(Client, EE)

module.exports = Client
