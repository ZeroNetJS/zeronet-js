"use strict"

const Client = require(__dirname + "/../client")
const net = require("net")

module.exports = function Server(config, zeronet) {
  //TODO: add more listening options, etc

  const self = this

  const log = zeronet.logger("server")
  log(config, "server listening on %s:%s", config.host, config.port)

  const server = self.server = net.createServer(client => {
    log({
      ip: client.remoteAddress
    }, "hello client %s", client.remoteAddress)
    client.zero = new Client({
      stream: client
    }, zeronet)
  })

  server.listen(config)
  self.address = config.host
  self.port = config.port

}
