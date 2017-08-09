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
const ZeroNet = require("../..")

const multiaddr = require("multiaddr")

let node

cryptos.forEach(crypto => {
  it("should handshake with " + crypto.name, (cb) => {
    node = ZeroNet({
      id: global.id,
      swarm: {
        server: {
          host: "127.0.0.1",
          port: 25335
        },
        protocol: {
          crypto: crypto.fnc
        }
      }
    })
    node.start(err => {
      if (err) return cb(err)

      node.swarm.dial(multiaddr("/ip4/127.0.0.1/tcp/25335"), (e, c) => {
        if (e) return cb(e)
        if (c.handshakeData.commonCrypto() != crypto.name) return cb(new Error("Failing: Wrong crypto used " + c.handshakeData.commonCrypto() + " != " + crypto.name))
        c.cmd.ping({}, cb)
      })
    })
  }).timeout(5000)
})

afterEach(function (cb) {
  this.timeout(5000)
  node.stop(cb)
})
