"use strict"

/**
 * ZeroNet Zite peer pool
 * @param {Zite} zite - The zite
 * @param {ZeroNet} zeronet - Global zeronet object
 * @namespace ZitePeerPool
 * @constructor
 */
module.exports = function ZitePeerPool(zite, zeronet) { //peer pool for a specific zite
  const self = this
  const pool = zeronet.peerPool

  function getAll() {
    return pool.getZite(zite.address)
  }

  function getConnected() {
    return pool.getZite(zite).filter(peer => !!peer.client)
  }

  self.getAll = getAll
  self.getConnected = getConnected
}
