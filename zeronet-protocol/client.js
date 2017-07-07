"use strict"

//const msg = require(__dirname + "/stream")
const msgstream = require(__dirname + "/msgstream")
const handshake = require(__dirname + "/handshake")
const msgpack = require("msgpack")

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const Readable = require("stream").Readable

const stable = require(__dirname + "/stable-stream")

const debug = require("debug")

module.exports = function Client(conn, protocol, zeronet, opt) {
  const self = this
  const log = debug("zeronet:protocol:client")

  /* Handling */

  const handlers = self.handlers = protocol.getHandlers(self)
  let addrs
  conn.getObservedAddrs((e, a) => addrs = (opt.isServer ? "=> " : "<= ") + a.map(a => a.toString()).join(", "))
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

  self.req_id = 0

  self.addCallback = addCallback

  self.write = d => {
    log("sent data", addrs, "\n", d)
    p.json(d)
  }

  /* Handshake */

  handshake(self, protocol, zeronet, opt)

  /* CMDS */

  const cmd = self.cmd = {}

  for (var name in handlers)
    cmd[name] = handlers[name].send.bind(handlers[name])

  /* stable-stream */

  let stream = new stable(conn)
  let stream2 = stream.create()

  /* how this works? just don't ask */

  const p = Pushable()
  const r = Readable()
  r._read = () => {}

  const m = msgstream(r)

  m.on("msg", data => {
    log("got  data", addrs, "\n", data)
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
    stream2.head,
    pull.map((data) => {
      r.push(data)
      return null
    }),
    pull.drain(() => {})
  )

  pull(
    p,
    stream2.tail
  )

  /* getRaw */

  self.cork = () => {
    stream2.destroy()
    stream2 = null
    stream = new stable(conn)
  }

  self.getRaw = cb => {
    try {
      if (stream2) stream2.destroy()
    } catch (e) {
      cb(e)
    }
    stream2 = stream.create()
    cb(null, stream2)
  }

}
