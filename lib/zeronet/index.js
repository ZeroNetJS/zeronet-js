"use strict"

const Server = require(__dirname + "/../server")
const uuid = require("uuid").v4
const tls = require("tls")

module.exports = function ZeroNet(config) {
  //shared module that contains database access, file functions, util functions, etc
  //TODO: write
  const self = this

  const version = self.version = "0.5.6" //TODO: those are all fake. use real ones.
  const rev = self.rev = 2109

  const peer_id = self.peer_id = "-ZN" + ("0" + self.version.replace(/./g, "")) + uuid().replace(/-/g, "").substr(0, 12)

  const secure = self.tls_context = tls.createSecureContext(config.tls)

  console.log("ZeroNet v[alpha] with peer_id %s", peer_id)

  let zites = self.zites = {} //zites we seed

  //Start a server
  let server = self.server = new Server(config.server, self)
}
