"use strict"

const msg = require(__dirname + "/stream")
const msgstream = require(__dirname + "/msgstream")
const handshake = require(__dirname + "/handshake")
const msgpack = require("msgpack")

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const Readable = require("stream").Readable

module.exports = function Client(conn, protocol, zeronet, opt) {
  const self = this

  /* Handling */

  const handlers = self.handlers = protocol.getHandlers(self)

  function handleIn(data) {
    if (handlers[data.cmd]) handlers[data.cmd].recv(data)
  }

  function handleOut(data, cb) {

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

  self.write = d => {
    p.json(d)
  }

  /* Handshake */

  handshake(self, protocol, zeronet, opt)

  /* CMDS */

  const cmd = self.cmd = {}

  for (var name in handlers)
    cmd[name] = handlers[name].send.bind(handlers[name])

  /* how this works? just don't ask */

  const p = Pushable()
  const r = Readable()
  r._read = () => {}

  const m = msgstream(r)

  m.on("msg", data => {
    if (data.cmd == "response") {
      handleResponse(data)
    } else {
      handleIn(data)
    }
  })

  p.json = (o) => {
    p.push(msgpack.pack(o))
  }

  /* logic */

  pull(
    p,
    conn,
    pull.map((data) => {
      r.push(data)
      return null
    }),
    pull.drain(() => {})
  )

}
