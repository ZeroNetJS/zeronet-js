"use strict"

const ZeroNet = require("../../")

const multiaddr = require("multiaddr")

let node

it("should handshake", (cb) => {
  node = ZeroNet({
    id: global.id,
    swarm: {
      server: {
        host: "127.0.0.1",
        port: 25335
      },
      protocol: {
        crypto: false
      }
    }
  })
  node.start(err => {
    if (err) return cb(err)

    node.swarm.dialZN(multiaddr("/ip4/127.0.0.1/tcp/25335"), (e, c) => {
      if (e) return cb(e)
      c.cmd.ping({}, cb)
    })
  })
})

it("should handshake with libp2p", (cb) => {
  node = ZeroNet({
    id: global.id,
    swarm: {
      server: {
        host: "127.0.0.1",
        port: 25335
      },
      protocol: {
        crypto: false
      },
      libp2p: {
        native: true
      }
    }
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
