"use strict"

const uuid = require("uuid").v4
const logger = require("zeronet-common/lib/logger")
const fs = require("fs")
const PeerPool = require("zeronet-common/lib/peer/pool")
const TrackerManager = require("zeronet-common/lib/tracker/manager")

module.exports = function ZeroNet(config) {
  //shared module that contains database access, file functions, util functions, etc
  //TODO: write
  const self = this

  self.version = "0.5.6" //TODO: those are all fake. use real ones.
  self.rev = 2109

  self.config = config

  let streams = [{
    level: (config.debug || process.env.DEBUG) ? 0 : "info",
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
  //-ZNXXXX- 8 chars + 12 chars random
  self.peer_id = "-ZN" + ("0" + self.version.replace(/\./g, "")) + "-" + uuid().replace(/-/g, "").substr(0, 12)

  if (!config.protocol || !config.protocol.crypto || !config.protocol.crypto.length) log.warn("CRYPTO DISABLED! ALL COMMUNICATION IS IN PLAINTEXT!")

  log("ZeroNet v[alpha] with peer_id %s", self.peer_id)

  self.zites = {} //zites we seed

  self.addZite = (address, zite) => {
    if (self.zites[address]) throw new Error("Tried duplicate adding " + address)
    log({
      address
    }, "Seeding %s", address)
    self.zites[address] = zite
  }

  //Globals
  self.pool = new PeerPool()
  self.trackers = new TrackerManager(self)
}
