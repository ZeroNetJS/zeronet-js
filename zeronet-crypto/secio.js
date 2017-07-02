"use strict"

const libp2p_secio = require("libp2p-secio")

module.exports = function SecioCrypto(protocol, zeronet) {
  protocol.crypto.add("secio", (conn, cb) => {
    libp2p_secio.encrypt(zeronet.config.id, zeronet.config.id._privKey, conn, cb)
  })
}
