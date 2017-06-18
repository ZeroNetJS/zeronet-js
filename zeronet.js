const ZeroNet = require("./lib/zeronet")
const Client = require("./lib/client/index.js")

const fs = require("fs")
const read = file => fs.readFileSync(file)

const zeronet = new ZeroNet({
  server: {
    host: "0.0.0.0",
    port: 15542
  }
})

const c = new Client({
  target: {
    host: "localhost",
    port: 15542
  },
  tls: {
    cert: read("./cert.pem"),
    key: read("./key.pem")
  }
}, zeronet)
//
c.handshake(() => c.getFile("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", "content.json", 1, console.log))
