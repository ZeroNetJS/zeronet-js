"use strict"

//const msg = require(__dirname + "/stream")
const msgstream = require(__dirname + "/msgstream")
const handshake = require(__dirname + "/handshake")
const msgpack = require("msgpack")

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const Readable = require("stream").Readable

const stable = require(__dirname + "/stable-stream")
const clone = require("clone")

const debug = require("debug")

function thingInspect(d, n) {
  if (Buffer.isBuffer(d)) return "<Buffer length=" + d.length + ">"
  return JSON.stringify(d)
}

const log = debug("zeronet:protocol:client")
const plog = debug("zeronet:protocol:client")
plog.enabled = !!process.env.DEBUG_PACKETS

function objectInspect(data, type) {
  if (!plog.enabled) return "-"
  let d = clone(data)
  let r = []
  switch (type) {
  case "resp":
    delete d.cmd
    delete d.to
    break;
  case "req":
    d = d.params
    break;
  }
  for (var p in d) {
    r.push(p + "=" + thingInspect(d[p], p))
  }
  return r.join(", ")
}

module.exports = function Client(conn, protocol, zeronet, opt) {
  const self = this

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

  self.write = data => {
    //log("sent data", addrs, "\n", d)
    if (data.cmd == "response") {
      plog("sent response", addrs, data.to, objectInspect(data, "resp"))
    } else {
      plog("sent  request", addrs, data.cmd, objectInspect(data, "req"))
    }
    p.json(data)
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
    //log("got  data", addrs, "\n", data)
    if (data.cmd == "response") {
      plog("got  response", addrs, data.to, objectInspect(data, "resp"))
      handleResponse(data)
    } else {
      plog("got   request", addrs, data.cmd, objectInspect(data, "req"))
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

  /* getRaw */

  self.getRaw = cb => {
    try {
      //p.destroy()
      r.destroy()
    } catch (e) {
      cb(e)
    }
    cb(null, conn)
  }

}
