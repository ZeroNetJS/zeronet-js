"use strict"

const verify = require(__dirname + "/../verify")
const Nonces = require(__dirname + "/../nonce")

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

  /* App */

  function handleGet(req, res, next) {
    //const path=req.url
  }
}
