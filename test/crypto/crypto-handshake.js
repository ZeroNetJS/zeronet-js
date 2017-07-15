"use strict"

const crypto_data = {
  "secio": require("zeronet-crypto/secio"),
  "tls-rsa": require("zeronet-crypto/tls")
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

let swarm

cryptos.forEach(crypto => {
  it("should handshake with " + crypto.name, (cb) => {
    swarm = new Node({
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
      storage: new memstore()
    }, err => {
      if (err) return cb(err)

      swarm.dial(multiaddr("/ip4/127.0.0.1/tcp/25335"), (e, c) => {
        if (e) return cb(e)
        c.client.waitForHandshake((err, handshake) => {
          if (handshake.commonCrypto() != crypto.name) return cb(new Error("Failing: Wrong crypto used " + handshake.commonCrypto() + " != " + crypto.name))
          c.client.cmd.getFile({
            site: "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
            inner_path: "content.json",
            location: 1
          }, err => {
            if (err) console.error("Unrelated error", err)
            return cb()
          })
        })
      })
    })
  }).timeout(10000)
})

afterEach(cb => swarm.stop(cb))
