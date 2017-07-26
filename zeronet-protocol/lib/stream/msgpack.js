//Modified version of https://github.com/alligator-io/pull-msgpack/blob/master/index.js

"use strict"

const msgpack = require('msgpack')
const through = require("pull-through")

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

  return through(function (chunk) {
    const self = this
    try {

      if (Buffer.isBuffer(buffer)) {
        var b = new Buffer(buffer.length + chunk.length)
        buffer.copy(b, 0, 0, buffer.length)
        chunk.copy(b, buffer.length, 0, chunk.length)
        buffer = b
      } else if (chunk) {
        buffer = chunk
      }

      while (Buffer.isBuffer(buffer) && buffer.length > 0) {
        var msg = msgpack.unpack(buffer)

        if (!msg) break

        self.queue(msg)

        if (msgpack.unpack.bytes_remaining > 0) {
          buffer = buffer.slice(
            buffer.length - msgpack.unpack.bytes_remaining,
            buffer.length
          )
        } else {
          buffer = null
        }
      }
    } catch (err) {
      throw err
    }
  })
}
