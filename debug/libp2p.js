const ZeroNetNode = require("zeronet-swarm")
const PeerId = require("peer-id")
const Client = require("zeronet-client")

PeerId.create((e, id) => {
  const node = new ZeroNetNode({
    id,
    server: {
      host: "0.0.0.0",
      port: 15443
    },
    tls: "disabled"
  }, err => {
    if (err) throw err

    node.dial(node.peerInfo,(e,c) => {
      /*c.handshake(() => {
        c.getFile("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", "content.json", 1, console.log)
      })*/
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
