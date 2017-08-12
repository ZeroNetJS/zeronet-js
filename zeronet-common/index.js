"use strict"

const logger = require("zeronet-common/lib/logger")
const fs = require("fs")

module.exports = function ZeroNet(config) {
  //shared module that contains database access, file functions, network functions, etc
  //TODO: write
  const self = this

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

  self.title = () => {}
  if (!process.platform.match(/^win/)) self.title = require("zeronet-common/lib/title")
}
