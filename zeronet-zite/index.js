"use strict"

const verify = require("zeronet-common/verify")
const Nonces = require("zeronet-common/nonce")

const Tracker = require("zeronet-common/tracker")
const Pool = require("./pool.js")

module.exports = function Zite(config, zeronet) { //describes a single zite
  const self = this

  if (!verify.verifyAddress(config.address))
    throw new Error("Invalid address")

  if (!config.wrapper_key) config.wrapper_key = verify.genNonce()

  self.config = config

  const address = self.address = config.address
  zeronet.addZite(address, self)

  /* Nonce */

  const nonce = new Nonces()
  self.getNonce = nonce.add
  self.redemNonce = nonce.redem

  /* Peers */

  const tracker = self.tracker = Tracker(address, zeronet)
  const mainpool = zeronet.pool
  const pool = new Pool(address, zeronet)
  tracker.on("peer", (addr) => {
    console.log("got a peer", addr)
    mainpool.addMany([addr], address) //using addMany instead of add because addMany was built to "just don't care"
  })
  tracker.update()

  /* App */

  function handleGet(req, res, next) {
    //const path=req.url
  }
}
