"use strict"

const protocol = require(__dirname + "/../protocol")
const connection = require(__dirname + "/../connection")

function Client(options, zeronet) { //zeronet client
  //can be created either via options.target
  //or stream from server can be passed in

  const self = this

  const stream = options.stream ? options.stream : connection.create(options.target, err => {
    if (!err) return
    end()
    self.emit("error", err)
  })

  function end() {

  }

  const p = new protocol(stream)

  /*
  PeerRequests:
    getFile site, inner_path, location
    ping
    pex site, peers, need
    update site, inner_path, body
  */

  p.registerHandler("getFile", (zite, inner_path, location, cb) => {
    if (!zeronet.zites[zite]) return cb("Unknown site")
    //TODO: finish
  })

  //TODO: add all server side stuff

  //TODO: add all client side stuff

  this.getFile = p.getFile //hack, this does not work for 512kb+

}

module.exports = Client

require("util").inherits(Client, require("events").EventEmitter)
