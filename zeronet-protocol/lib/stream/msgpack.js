//Modified version of https://github.com/alligator-io/pull-msgpack/blob/master/index.js

"use strict"

const msgpack = require('msgpack5')({
  compatibilityMode: true
})
const queue = require("pull-queue")
const bl = require("bl")

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
          callback(null, msgpack.encode(c))
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
  let chunks = bl()

  return queue(function (end, buf, cb) {
    if (end) return cb(end)

    if (buf)
      chunks.append(buf)

    let res_ = []

    function d(cb) {
      try {
        var result = msgpack.decode(chunks)
        cb(null, result)
      } catch (err) {
        if (err instanceof msgpack.IncompleteBufferError) {
          cb()
        } else {
          cb(err)
        }
        return
      }
    }

    function loop() {
      d((err, res) => {
        if (err) return cb(err)
        if (res) {
          res_.push(res)
          loop()
        } else return cb(null, res_)
      })
    }

    loop()
  }, {
    sendMany: true
  })
}
