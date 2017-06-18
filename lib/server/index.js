"use strict"

const Client = require(__dirname + "/../client")
const net = require("net")

module.exports = function Server(config, zeronet) {
  //TODO: add more listening options, etc

  const self = this

  console.log("server listening", config)

  const server = self.server = net.createServer(client => {
    console.log("hello client")
    client.zero = new Client({
      stream: client
    }, zeronet)
  })

  server.listen(config)

}
