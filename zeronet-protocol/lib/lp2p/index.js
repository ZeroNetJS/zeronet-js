"use strict"

const ppb = require("pull-protocol-buffers").pull
const pull = require("pull-stream")
const empty = require("protocol-buffers")("message PeerCmd {required bool empty = 1;}").PeerCmd.encode({
  empty: true
})

module.exports = function LProtocol(opt, lp2p) {

  const self = this
  const swarm = lp2p.libp2p
  const protos = self.protos = {}

  if (!opt) opt = {}

  self.handle = (name, proto) => {
    protos[name] = proto
    swarm.handle("/zn/" + name + "/2.0.0", (protocol, conn) => {
      pull(
        conn,
        ppb.decode(proto.in.proto.msg),
        pull.take(1),
        pull.asyncMap((data, cb) => {
          console.log("prc", data,cb)
          proto.peerRequest.handleRequest(cb, data, proto.handler)
        }),
        ppb.encode(proto.out.proto.msg),
        conn
      )
    })
  }

  lp2p.cmd = (peer, cmd, data, cb) => {
    if (!protos[cmd]) return cb(new Error("CMD Unsupported"))
    const proto = protos[cmd]
    lp2p.dial(peer, "/zn/" + cmd + "/2.0.0", (err, conn) => {
      if (err) return cb(err)
      proto.peerRequest.sendRequest((data, cb) => {
        pull(
          pull.values([data]),
          ppb.encode(proto.in.proto.msg),
          pull.collect((err, data) => {
            if (err) return cb(err)
            if (!data.length) data = [empty]
            pull(
              pull.values(data),
              conn,
              ppb.decode(proto.out.def),
              pull.collect((err, data) => {
                if (err) return cb(err)
                else {
                  if (data.length != 1) cb(new Error("Decoding failed! data.len != 1"))
                  return cb(null, data[0])
                }
              })
            )
          })
        )
      }, data, cb)
    })
  }

}
