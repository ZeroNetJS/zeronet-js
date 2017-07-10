"use strict"

module.exports = function ZitePeerPool(zite, zeronet) { //peer pool for a specific zite
  const self = this
  const pool = zeronet.pool

  function getAll() {
    return pool.getZite(zite)
  }

  self.getAll = getAll
}
