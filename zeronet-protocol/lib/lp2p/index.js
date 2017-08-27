"use strict"

const ppb = require("pull-protocol-buffers")
const pull = require("pull-stream")

module.exports = function LProtocol(opt, lp2p) {

  const self = this
  const swarm = lp2p.libp2p
  const protos = self.protos = {}

  if (!opt) opt = {}

  self.handle = (name, proto) => {
    protos[name] = proto
    swarm.handle("/zn/" + name + "/2.0.0/", (protocol, conn) => {
      pull(
        conn,
        ppb.decode(proto.in.proto.def),
        pull.asyncMap((data, cb) => {
          proto.peerRequest.handleRequest(cb, data, proto.handler)
        }),
        ppb.encode(proto.out.proto.def),
        conn
      )
    })
  }

  lp2p.cmd = (peer, cmd, data, cb) => {
    if (!protos[cmd]) return cb(new Error("CMD Unsupported"))
    const proto = protos[cmd]
    lp2p.dial(peer, "/zn/" + cmd + "/2.0.0/", (err, conn) => {
      if (err) return cb(err)
      proto.peerRequest.sendRequest((data, cb) => {
        pull(
          pull.values([data]),
          ppb.encode(proto.in.def),
          conn,
          ppb.decode(proto.out.def),
          pull.collect((err, data) => {
            if (err) return cb(err)
            else {
              if (data.length != 1) cb(new Error("Decoding failed!"))
              return cb(null, data[0])
            }
          })
        )
      }, data, cb)
    })
  }

}
