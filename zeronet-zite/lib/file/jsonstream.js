"use strict"

const queue = require("pull-queue")

module.exports = function JSONStream() {
  let d = ""
  return queue(function (end, data, cb) {
    if (end) {
      if (!d) return cb(end)
      try { //just send the error
        JSON.parse(d)
      } catch (e) {
        return cb(e)
      }
    }
    d += data.toString()
    let r
    try {
      r = JSON.parse(d)
    } catch (e) {
      return cb()
    }
    d = ""
    cb(null, r)
  })
}
