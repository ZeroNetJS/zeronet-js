"use strict"

const path = require("path")
const protocol = require(path.join(__dirname, "/../protocol"))
const connection = require(path.join(__dirname, "/../connection"))
const getRaw = require("pull-stream-to-stream")

function Client(options, zeronet) { //zeronet client
  //can be created either via options.target
  //or stream from server can be passed in

  const self = this

  const isServer = typeof options.isServer == "undefined" ? !!options.stream : options.isServer

  const prefix = "client(" + (isServer ? "=>" : "<=") + (options.target ? (options.target.host + ":" + options.target.port) : options.isServer ? options.stream.remoteAddress : (options.stream.remoteAddress + ":" + options.stream.remotePort)) + ")"

  const logger = self.logger = (name) => zeronet.logger(prefix + ":" + name)

  //const log = self.logger("client")

  const stream = options.stream ? options.stream : connection.create(options.target, err => {
    if (!err) return
    end()
    self.emit("error", err)
  })

  function end() {

  }

  const p = new protocol(stream, {
    isServer,
    logger
  }, zeronet)

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
  this.handshake = p.handshake

}

Client.finalize = (conn, cb) => {
  conn.handshake(cb)
}

Client.upgradeConn = (conn, zeronet, cb) => {
  const stream = getRaw(conn)
  conn.getObservedAddrs((err, addrs) => {
    if (err) return cb(err)
    stream.remoteFamily = addrs[0].toString().split("/")[1].replace("ip", "IPv")
    stream.remoteAddress = addrs[0].toString().split("/")[2]
    stream.remotePort = parseInt(addrs[0].toString().split("/")[4], 10)
    conn.zero = new Client({
      stream: stream,
      isServer: conn.zinfo.isServer
    }, zeronet)
    Client.finalize(conn.zero, cb)
  })
}

module.exports = Client

require("util").inherits(Client, require("events").EventEmitter)
