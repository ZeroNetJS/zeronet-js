"use strict"

module.exports = function DHT() {
  const self = this

  self.isAvailable = false
  self.start = cb => cb()
  self.stop = cb => cb()
  self.discover = cb => cb()
}
