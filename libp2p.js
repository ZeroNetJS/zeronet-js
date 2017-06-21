const ZeroNetNode = require(__dirname)
const PeerId = require("peer-id")
const Client = require("./lib/client/index.js")

PeerId.create((e, id) => {
  const node = new ZeroNetNode({
    id,
    server: {
      host: "0.0.0.0",
      port: 15443
    }
  }, err => {
    if (err) throw err
    node.dial(node.peerInfo, "/zeronet/v2", console.log)

    console.log(node.transports)

    const c = new Client({
      target: {
        host: "localhost",
        port: 15443
      }
    }, node.zeronet)
    c.getFile("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", "content.json", 1, console.log)
  })
})
