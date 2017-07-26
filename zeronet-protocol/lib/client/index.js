"use strict"

const msgstream = require("zeronet-protocol/lib/stream/msgpack")
//const stable = require("zeronet-protocol/lib/stream/stable")
const handshake = require("zeronet-protocol/lib/proto/handshake")
const EE = require("events").EventEmitter

const pull = require('pull-stream')

const clone = require("clone")

const debug = require("debug")

function thingInspect(d /*, n*/ ) {
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
  const ee = new EE()
  let d

  /* Handling */

  const handlers = self.handlers = protocol.getHandlers(self)
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

  self.req_id = 0

  self.addCallback = addCallback

  self.write = data => {
    if (data.cmd == "response") {
      plog("sent response", addrs, data.to, objectInspect(data, "resp"))
    } else {
      plog("sent  request", addrs, data.cmd, objectInspect(data, "req"))
    }
    d.write(data)
  }

  /* Handshake */

  handshake(self, protocol, zeronet, opt)

  /* CMDS */

  const cmd = self.cmd = {}

  for (var name in handlers)
    cmd[name] = handlers[name].send.bind(handlers[name])

  function disconnect() {
    //TODO: add
  }

  /* new stream. it works without magic */

  function clientDuplex() {
    let q = []

    return {
      sink: function (read) {
        read(null, function next(end, data) {
          if (!data) return setTimeout(read, 100, null, next) //FIXME: there is somthing wrong with the stream. that's why it throws empty data at us instead of listening for it
          //if (typeof data != "object" || !data.cmd) return setTimeout(read, 1000, null, next) //cool down for bad behaviour
          try {
            if (data.cmd == "response") {
              plog("got  response", addrs, data.to, objectInspect(data, "resp"))
              handleResponse(data)
            } else {
              plog("got   request", addrs, data.cmd, objectInspect(data, "req"))
              handleIn(data)
            }
          } catch (e) {
            log(e)
          }
          read(null, next)
        })
      },
      source: function (end, cb) {
        if (end) return disconnect(end)

        function doSend() {
          cb(null, q.unshift())
        }
        if (q.length) return doSend()
        else ee.once("data", doSend)
      },
      write: data => {
        q.push(data)
        ee.emit("data")
      }
    }
  }

  /* logic */

  const s = conn //stable(conn)

  d = clientDuplex()

  pull(
    s,
    msgstream.unpack(),
    d.sink
  )
  pull(
    d.source,
    msgstream.pack(),
    s
  )

  /* getRaw */

  self.getRaw = cb => {
    try {
      //
    } catch (e) {
      cb(e)
    }
    cb(null, conn)
  }

}
