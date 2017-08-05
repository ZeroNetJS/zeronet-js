"use strict"

const queue = require("pull-queue")
const crypto = require("zeronet-crypto")

module.exports.parse = function JSONParseStream() {
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

module.exports.stringify = function JSONStringifyStream() {
  return function (read, next) {
    //return a readable function!
    return function (end, cb) {
      read(end, function (end, data) {
        cb(end, data != null ? next(JSON.stringify(data)) : null)
      })
    }
  }
}

module.exports.crypto = function JSONStringifyCryptovalidStream() {
  return function (read, next) {
    //return a readable function!
    return function (end, cb) {
      read(end, function (end, data) {
        cb(end, data != null ? next(crypto.JSONBlock(data)) : null)
      })
    }
  }
}
