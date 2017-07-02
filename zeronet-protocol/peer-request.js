"use strict"

const validate = require("zeronet-common/verify").verifyProtocol

function PeerRequest(name, params, ret) {
  const self = this
  self.sendRequest = (send, data, cb) => {
    validate(params, data)

    if (typeof cb != "function") throw new Error("CB must be a function")

    send(data, (err, data) => {
      if (err) return cb(err)
      validate(ret, data)
      return cb(null, data)
    })
  }

  self.handleRequest = (respond, data, handler) => {
    validate(params, data)
    handler(data, (err, res) => {
      if (err) return respond(err)
      validate(ret, res)
      return respond(null, res)
    })
  }

  self.defIn = ret
  self.defOut = params
  self.name = name
}
module.exports = PeerRequest
