"use strict"

const msg = require(__dirname + "/stream")
const pull = require("pull-stream")
const handshake = require(__dirname + "/handshake")

module.exports = function Client(conn, protocol, zeronet, opt) {
  const self = this

  function handler() {
    return function map(read, map) {
      //return a readable function!
      return function (end, cb) {
        read(end, function (end, data) {
          //we've got an object
          if (end) return cb(end)
          if (data == null) return cb(new Error("Malformed data"))
          //Go trough all handlers and call "map" with the final res

          function next(data) {
            cb(end, map(data))
          }

          if (data.cmd == "response") {
            handleResponse(data, next)
          } else {
            handleIn(data, next)
          }
          //cb(end, data != null ? map(data) : null)
        })
      }
    }
  }

  /* Handling */

  const handlers = self.handlers = protocol.getHandlers(self)

  function handleIn(data, send) {
    if (handlers[data.cmd]) handlers[data.cmd](data, send)
  }

  function handleOut(data, cb) {

  }

  /* Callbacks */

  let cbs = {}

  function addCallback(id, cb) {
    cbs[id] = cb
  }

  function handleResponse(data, send) {
    if (cbs[data.to]) {
      cbs[data.to](data)
      delete cbs[data.to]
    }
  }

  self.addCallback = addCallback

  /* Handshake */

  handshake(self, protocol, zeronet, opt)

  /* CMDS */

  const cmd = self.cmd = {}

  for (var name in handlers)
    cmd[name] = handlers[name].send.bind(handlers[name])

  pull(
    conn,
    msg.unpack,
    handler,
    msg.pack,
    conn
  )
}
