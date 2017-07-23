"use strict"

const verify = require("zeronet-common/lib/verify")
const Nonces = require("zeronet-common/lib/nonce")

const Pool = require("zeronet-zite/lib/pool.js")
const Queue = require("zeronet-zite/lib/queue.js")
const Tree = require("zeronet-zite/lib/tree.js")

const series = require("async/series")

/**
 * ZeroNet Zite
 * @param {object} config - configuration of the Zite
 * @param {ZeroNetNode} zeronet - ZeroNet Node
 * @namespace Zite
 * @constructor
 */
module.exports = function Zite(config, node) { //describes a single zite
  const self = this

  if (!verify.verifyAddress(config.address))
    throw new Error("Invalid address")

  if (!config.wrapper_key) config.wrapper_key = verify.genNonce()

  self.config = config

  const address = self.address = config.address
  node.addZite(address, self)

  /* Nonce */

  const nonce = new Nonces()
  self.getNonce = nonce.add
  self.redemNonce = nonce.redem

  /* Peers */

  const tracker = self.tracker = node.trackers.create(address)
  const pool = self.pool = new Pool(address, node)
  const queue = self.queue = new Queue(self)
  const tree = self.tree = new Tree(self, node.storage)

  /* App */

  function handleGet(req, res, next) {
    //const path=req.url
  }

  /* Main */

  self.start = cb => series([
    tree.build
  ], cb)

  self.stop = cb => series([
    queue.shutdown
  ], cb)

  /* JSON */

  /**
   * Converts the site to json
   * @returns {object}
   * @category Zite
   */
  self.toJSON = () => {
    return config
  }
}

module.exports.fromJSON = zeronet =>
  (data, cb) => cb(null, new module.exports(data, zeronet))
