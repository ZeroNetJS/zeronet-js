"use strict"

const msg = require(__dirname + "/stream")
const pull = require("pull-stream")

module.exports=function Client(conn,protocol,zeronet) {
  function handler() {
    /*
    return function map(read, map) {
      //return a readable function!
      return function (end, cb) {
        read(end, function (end, data) {
          //we've got an object
          if (end) return cb(end)
          if (data == null) return cb(new Error("Malformed data"))
          //Go trough all handlers and call "map" with the final res
          //cb(end, data != null ? map(data) : null)
        })
      }
    }
    */
  }

  function handleIn(data) {
    protocol.doHandle(data.cmd,data)
  }

  function handleOut(data,cb) {

  }

  pull(
    conn,
    msg.unpack,
    handler,
    msg.pack,
    conn
  )
}
