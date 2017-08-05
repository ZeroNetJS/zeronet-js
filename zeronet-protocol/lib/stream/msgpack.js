//Modified version of https://github.com/alligator-io/pull-msgpack/blob/master/index.js

"use strict"

const msgpack = require('msgpack')
const queue = require("pull-queue")

module.exports.pack = function () {
  var ended = false

  return function (read) {
    return function (abort, callback) {
      if (abort) return read(abort, callback)

      if (ended)
        return callback(ended)

      read(abort, function next(end, c) {
        if (end) {
          ended = end
          return callback(end)
        }

        try {
          callback(null, msgpack.pack(c))
        } catch (err) {
          ended = err
        }

        if (!ended) read(null, next)
      })
    }
  }
}

module.exports.unpack = function () {
  //var ended = null
  let buffer = null

  return queue(function (end, chunk, cb) {
    if (end) return cb(end)
    
    try {

      if (Buffer.isBuffer(buffer)) {
        var b = new Buffer(buffer.length + chunk.length)
        buffer.copy(b, 0, 0, buffer.length)
        chunk.copy(b, buffer.length, 0, chunk.length)
        buffer = b
      } else if (chunk) {
        buffer = chunk
      }

      let send = []

      while (Buffer.isBuffer(buffer) && buffer.length > 0) {
        var msg = msgpack.unpack(buffer)

        if (!msg) break

        send.push(msg)

        if (msgpack.unpack.bytes_remaining > 0) {
          buffer = buffer.slice(
            buffer.length - msgpack.unpack.bytes_remaining,
            buffer.length
          )
        } else {
          buffer = null
        }
      }
      cb(null, send)
    } catch (err) {
      cb(err)
    }
  }, {
    sendMany: true
  })
}
