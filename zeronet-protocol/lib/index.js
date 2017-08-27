"use strict"

const protobuf = require("protocol-buffers")
const assert = require("assert")

function protoparse(def) {
  let r = "message PeerCmd {"
  if (def._) {
    r += def._
    delete def._
  }
  for (var i in def) {
    const v = def[i]
    r += v[0] + " " + v[1] + " = " + i + " ;"
  }
  r += "}"
  return r
}

function PeerMSG(def) {
  const self = this
  self.proto = {}
  self.proto.def = protoparse(def.protobuf)
  self.proto.msg = protobuf(self.proto.def)
  self.strict = def.strict
}

function Protocol() {
  const self = this
  const protos = self.protos = {}
  self.handle = (name, opt, handler) => {
    assert(opt.in, "input definition missing")
    if (!opt.out) opt.out = opt.in
    protos[name] = {
      _opt: opt,
      in: new PeerMSG(opt.in),
      out: new PeerMSG(opt.out),
      handler
    }
  }
}

module.exports = Protocol
module.exports.PeerMSG = PeerMSG
module.exports.Zero = require("./zero")
