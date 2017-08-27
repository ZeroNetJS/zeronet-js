"use strict"

const ppb = require("pull-protocol-buffers").pull
const pull = require("pull-stream")
const empty = require("protocol-buffers")("message PeerCmd {required bool empty = 1;}").PeerCmd.encode({
  empty: true
})
const once = require("once")

module.exports = function LProtocol(opt, lp2p) {

  const self = this
  const swarm = lp2p.libp2p
  const protos = self.protos = {}

  if (!opt) opt = {}

  self.handle = (name, proto) => {
    protos[name] = proto
    swarm.handle("/zn/" + name + "/2.0.0", (protocol, conn) => {
      pull(
        conn.source,
        ppb.decode(proto.in.proto.msg),
        pull.take(1),
        pull.asyncMap((data, cb) =>
          proto.peerRequest.handleRequest(cb, data, proto.handler)),
        ppb.encode(proto.out.proto.msg),
        conn.sink
      )
    })
  }

  lp2p.cmd = (peer, cmd, data, _cb) => {
    const cb = once(_cb)
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
            if (!data.length || !data[0].length) data = [empty]
            pull(
              pull.values(data),
              conn,
              ppb.decode(proto.out.proto.msg),
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
