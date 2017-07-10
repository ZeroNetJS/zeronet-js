"use strict"

const path = require("path")
const Server = require("zeronet-fileserver")
const UiServer = require("zeronet-uiserver")
const uuid = require("uuid").v4
const tls = require("tls")
const logger = require(__dirname + "/logger")
const fs = require("fs")

module.exports = function ZeroNet(config) {
  //shared module that contains database access, file functions, util functions, etc
  //TODO: write
  const self = this

  self.version = "0.5.6" //TODO: those are all fake. use real ones.
  self.rev = 2109

  self.config = config

  let streams = [{
    level: config.debug ? 0 : "info",
    stream: process.stdout
  }]

  if (config.debug_file) {
    if (config.debug_shift_file) {
      if (fs.existsSync(config.debug_file)) {
        if (fs.existsSync(config.debug_shift_file)) fs.unlinkSync(config.debug_shift_file)
        fs.renameSync(config.debug_file, config.debug_shift_file)
      }
    }

    const ws = fs.createWriteStream(config.debug_file)

    global.ZeroLogWS = ws

    streams.push({
      level: "debug",
      stream: ws
    })
  }

  self.logger = logger({
    src: !!config.trace,
    streams
  })
  const log = self.logger("main")

  self.peer_id = "-ZN" + ("0" + self.version.replace(/\./g, "")) + "-" + new Buffer(uuid().replace(/-/g, "").substr(0, 12)).toString("base64").substr(0, 12)

  if (config.tls == "disabled") {
    self.tls_disabled = true
    log.warn("TLS IS DISABLED")
    log.warn("ALL CONNECTIONS ARE UNENCRYPTED (WHICH MEANS THE NSA PROBABLY ALREADY LISTENS)")
    log.warn("PLEASE ONLY ENABLE THIS IF YOU ARE SURE WHAT YOU ARE DOING")
  } else if (config.tls) {
    self.tls_context = tls.createSecureContext(config.tls)
  } else {}

  log("ZeroNet v[alpha] with peer_id %s", self.peer_id)

  self.zites = {} //zites we seed

  self.addZite = (address, zite) => {
    if (self.zites[address]) throw new Error("Tried duplicate adding " + address)
    log({
      address
    }, "Seeding %s", address)
    self.zites[address] = zite
  }

  //Start a file server
  if (config.server) self.server = new Server(config.server, self)

  //Start a ui server
  if (config.uiserver) self.uiserver = new UiServer(config.uiserver, self)
}
