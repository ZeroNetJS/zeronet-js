"use strict"

const Server = require(__dirname + "/../server")

module.exports = function ZeroNet(config) {
  //shared module that contains database access, file functions, util functions, etc
  //TODO: write
  const self = this
  let zites = self.zites = {} //zites we seed

  //Start a server
  let server = self.server = new Server(config.server, self)
}
