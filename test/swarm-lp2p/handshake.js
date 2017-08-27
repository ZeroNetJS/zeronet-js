"use strict"

const ZeroNet = require("../../")

const multiaddr = require("multiaddr")

let node

describe("handshake", () => {
  it("should handshake and ping", (cb) => {
    node = ZeroNet({
      id: global.id,
      swarm: {
        zero: {
          listen: [
            "/ip4/127.0.0.1/tcp/25335"
          ],
          crypto: false
        },
        libp2p: {
          listen: [
            "/ip4/127.0.0.1/tcp/25533"
          ]
        }
      }
    })
    node.start(err => {
      if (err) return cb(err)
      node.swarm.dial(multiaddr("/ip4/127.0.0.1/tcp/25335"), "ping", {}, cb)
    })
  })

  afterEach(function (cb) {
    this.timeout(5000)
    node.stop(() => cb())
  })
})
