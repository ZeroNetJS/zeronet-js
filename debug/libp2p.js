const ZeroNetNode = require("zeronet-swarm")
const PeerId = require("peer-id")
const multiaddr = require("multiaddr")
//const Client = require("zeronet-client")
const Crypto = require("zeronet-crypto")

PeerId.create((e, id) => {
  const node = new ZeroNetNode({
    id,
    server: {
      host: "0.0.0.0",
      port: 15443
    },
    server6: {
      host: "::",
      port: 15543
    },
    tls: "disabled"
  }, err => {
    if (err) throw err

    node.dial( /*node.peerInfo*/ multiaddr("/ip4/127.0.0.1/tcp/15542/"), (e, c) => {
      if (e) return console.error(e)
      c.client.cmd.getFile({
        site: "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
        inner_path: "content.json",
        location: 0
      }, (err, data) => {
        if (err) throw err
        const cj = JSON.parse(data.body.toString())
        console.log(cj)
        console.log(Crypto.VerifyContentJSON("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", "content.json", cj))
      })
    })

    /*const c = new Client({
      target: {
        host: "localhost",
        port: 15443
      }
    }, node.zeronet)
    c.handshake(() => {
      c.getFile("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", "content.json", 1, console.log)
    })*/
  })
})
