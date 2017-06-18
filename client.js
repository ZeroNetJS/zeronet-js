const net = require('net')

const msgpack = require("msgpack")

const Protocol = require("./lib/protocol/")

const sock = net.connect({
  host: "localhost",
  port: 15441
}, err => {
  if (err) console.error(err)
  const client = new Protocol(sock)
  client.getFile("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", "content.json", 100, console.log)
})
