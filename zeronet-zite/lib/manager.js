"use strict"

const each = require("async/each")
const Zite = require("zeronet-zite")

module.exports = function ZiteManager(zeronet) {
  const self = this

  const log = zeronet.logger("zites")

  self.zites = {}

  self.add = (address, zite) => {
    if (self.zites[address]) throw new Error("Tried duplicate adding " + address)
    log({
      address
    }, "Seeding %s", address)
    self.zites[address] = zite
  }

  self.fromJSON = (data, cb) => {
    each(data, Zite.fromJSON(zeronet), cb)
  }

  self.toJSON = () => {
    let res = []
    for (var z in self.zites)
      res.push(self.zites[z].toJSON())
    return res
  }
}
