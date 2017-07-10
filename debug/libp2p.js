const ZeroNetNode = require("zeronet-swarm")
const PeerId = require("peer-id")
const multiaddr = require("multiaddr")
//const Client = require("zeronet-client")
const Crypto = require("zeronet-crypto")

PeerId.create((e, id) => {
  const opt = {
    id,
    //tls: "disabled".
    secio: "disabled"
  }

  if (process.env.server) {
    opt.server = {
      host: "0.0.0.0",
      port: 15443
    }
    opt.server6 = {
      host: "::",
      port: 15543
    }
  }

  const node = new ZeroNetNode(opt, err => {
    if (err) throw err

    if (process.env.verify) node.dial( multiaddr("/ip4/127.0.0.1/tcp/15542/"), (e, c) => {
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

    if (process.env.dial) node.dial(multiaddr("/ip4/127.0.0.1/tcp/15542/"), (e, c) => {
      if (e) return console.error(e)
      console.log("Connected", c.client.cmd.getFile)
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
