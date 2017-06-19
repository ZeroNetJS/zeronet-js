"use strict"

module.exports = function Zite(config, zeronet) { //describes a single zite
  //TODO: add some validation
  //TODO: add some code
  const self = this
  const address = self.address = config.address
  zeronet.addZite(address, self)
}
