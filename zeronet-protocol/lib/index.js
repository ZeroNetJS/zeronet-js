"use strict"

const protobuf = require("protocol-buffers")

function Protocol() {
  const self = this
  const protos = self.protos = {}
  self.handle = (name, opt, handler) => {

  }
}

module.exports = Protocol
module.exports.Zero = require("./zero")
