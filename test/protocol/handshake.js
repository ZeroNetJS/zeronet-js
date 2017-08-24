"use strict"

const Node = require("zeronet-node")

const multiaddr = require("multiaddr")
const memstore = require("zeronet-storage-memory")

let node

it("should handshake", (cb) => {
  node = new Node({
    id: global.id,
    swarm: {
      server: {
        host: "127.0.0.1",
        port: 25335
      },
      protocol: {}
    },
    uiserver: false,
    storage: new memstore()
  })
  node.start(err => {
    if (err) return cb(err)

    node.swarm.dialZN(multiaddr("/ip4/127.0.0.1/tcp/25335"), (e, c) => {
      if (e) return cb(e)
      c.cmd.ping({}, cb)
    })
  })
})

afterEach(function (cb) {
  this.timeout(5000)
  node.stop(cb)
})
