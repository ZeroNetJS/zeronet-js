const tls = require('tls')
const net = require('net')

const msgpack = require("msgpack")

//new tls.TLSSocket()
const sock = net.connect({
  host: "localhost",
  port: 15441
}, err => {
  if (err) console.error(err)
  const s = new msgpack.Stream(sock)
  s.on("msg", console.log)
  sock.write(msgpack.pack({
    "cmd": "getFile",
    "req_id": 1,
    "params": {
      "site": "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
      "inner_path": "content.json",
      "location": 0
    }
  }))
})
