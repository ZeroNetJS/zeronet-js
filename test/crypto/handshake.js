"use strict"

const crypto_data = {
  "secio": require("zeronet-crypto/secio"),
  //"tls-rsa": require("zeronet-crypto/tls")
}

const cryptos = Object.keys(crypto_data).map(c => {
  return {
    name: c,
    fnc: crypto_data[c]
  }
})
const Node = require("zeronet-node")

const multiaddr = require("multiaddr")
const memstore = require("zeronet-storage-memory")

let node

cryptos.forEach(crypto => {
  it("should handshake with " + crypto.name, (cb) => {
    node = new Node({
      id: global.id,
      swarm: {
        server: {
          host: "127.0.0.1",
          port: 25335
        },
        protocol: {
          crypto: crypto.fnc
        }
      },
      uiserver: false,
      storage: new memstore()
    })
    node.start(err => {
      if (err) return cb(err)

      node.swarm.dial(multiaddr("/ip4/127.0.0.1/tcp/25335"), (e, c) => {
        if (e) return cb(e)
        if (c.handshakeData.commonCrypto() != crypto.name) return cb(new Error("Failing: Wrong crypto used " + c.handshakeData.commonCrypto() + " != " + crypto.name))
        c.cmd.getFile({
          site: "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
          inner_path: "content.json",
          location: 1
        }, err => {
          if (err) console.error("Unrelated error", err)
          return cb()
        })
      })
    })
  }).timeout(5000)
})

afterEach(function (cb) {
  this.timeout(5000)
  node.stop(cb)
})
