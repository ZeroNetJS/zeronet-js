"use strict"

module.exports = function Defaults(protocol, zeronet) {
  protocol.handle("ping", {}, {
    body: b => b == "pong"
  }, (data, cb) => cb({
    body: "pong"
  }))
}
