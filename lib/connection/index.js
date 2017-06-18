"use strict"

const net = require("net")

function create(options, cb) {
  //options:
  // protocol: tor/clear/tls (default "clear")
  // host: ip address or hostname
  // port: port
  //TODO: add some validation and more then protocol clear
  //TODO: modualirize
  if (!options.protocol) options.protocol = "clear"
  return net.connect({
    host: options.host,
    port: options.port
  }, cb)
}

module.exports = {
  create
}
