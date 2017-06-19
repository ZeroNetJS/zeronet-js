"use strict"

const path = require("path")
const Server = require(path.join(__dirname, "/../server"))
const uuid = require("uuid").v4
const tls = require("tls")
const logger = require(path.join(__dirname, "/../logger"))

module.exports = function ZeroNet(config) {
  //shared module that contains database access, file functions, util functions, etc
  //TODO: write
  const self = this

  self.version = "0.5.6" //TODO: those are all fake. use real ones.
  self.rev = 2109

  self.logger = logger
  const log = self.logger("main")

  self.peer_id = "-ZN" + ("0" + self.version.replace(/\./g, "")) + uuid().replace(/-/g, "").substr(0, 12)

  self.tls_context = tls.createSecureContext(config.tls)

  log("ZeroNet v[alpha] with peer_id %s", self.peer_id)

  self.zites = {} //zites we seed

  //Start a file server
  if (config.server) self.server = new Server(config.server, self)
}
