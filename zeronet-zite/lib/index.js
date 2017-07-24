"use strict"

const verify = require("zeronet-common/lib/verify")
const Nonces = require("zeronet-common/lib/nonce")

const Pool = require("zeronet-zite/lib/pool")
const Queue = require("zeronet-zite/lib/queue")
const Tree = require("zeronet-zite/lib/tree")

const series = require("async/series")

const Discovery = require("zeronet-zite/lib/discovery")
const Dtracker = require("zeronet-zite/lib/discovery/tracker")
const Dpex = require("zeronet-zite/lib/discovery/pex")
const Ddht = require("zeronet-zite/lib/discovery/dht")

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

  const discovery = self.discovery = new Discovery(self, node, config.discovery || [
    Dtracker,
    Dpex,
    Ddht
  ])
  self.pool = new Pool(self, node)
  const tree = self.tree = new Tree(self)
  const queue = self.queue = new Queue(self)
  tree.attach(node.storage)

  /* App */

  /*function handleGet(req, res, next) {
    //const path=req.url
  }*/

  /* Main */

  self.start = cb => series([
    discovery.start,
    tree.build,
    queue.start,
    cb => {
      queue.add("content.json", (err, stream) => {
        if (err) console.error("init", err)
        console.log("got stream", stream)
      }, (err, hash, size) => {
        console.error("res", err)
        console.log("res", hash, size)
      })
      cb()
    }
  ], cb)

  self.stop = cb => series([
    queue.stop,
    discovery.stop
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
  (data, cb) => {
    const z = new module.exports(data, zeronet)
    z.start(err => cb(err, z))
  }
