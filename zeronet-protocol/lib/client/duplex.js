"use strict"

const debug = require("debug")
const plog = debug("zeronet:protocol:client")
const clone = require("clone")
const EE = require("events").EventEmitter

function thingInspect(d /*, n*/ ) {
  if (Buffer.isBuffer(d)) return "<Buffer length=" + d.length + ">"
  return JSON.stringify(d)
}

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
  for (var p in d)
    r.push(p + "=" + thingInspect(d[p], p))
  return r.join(", ")
}

function clientDuplex(addrs, handleIn, handleResponse, disconnect) {
  let q = []
  const ee = new EE()
  let ended = true

  return {
    sink: function (read) {
      read(null, function next(end, data) {
        if (!data || typeof data != "object" || !data.cmd) return read(null, next)
        try {
          if (data.cmd == "response") {
            plog("got  response", addrs, data.to, objectInspect(data, "resp"))
            handleResponse(data)
          } else {
            plog("got   request", addrs, data.cmd, objectInspect(data, "req"))
            handleIn(data)
          }
        } catch (e) {
          plog(e)
        }
        read(ended, next)
      })
    },
    source: function (end, cb) {
      if (end) return disconnect(end)

      function doSend() {
        cb(null, q.shift())
      }
      if (q.length) return doSend()
      else ee.once("data", doSend)
    },
    write: data => {
      if (data.cmd == "response") {
        plog("sent response", addrs, data.to, objectInspect(data, "resp"))
      } else {
        plog("sent  request", addrs, data.cmd, objectInspect(data, "req"))
      }
      q.push(data)
      ee.emit("data")
    },
    end: e => {
      ended = e || true
    }
  }
}
module.exports = clientDuplex
