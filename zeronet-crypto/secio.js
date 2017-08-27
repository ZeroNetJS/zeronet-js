"use strict"

const libp2p_secio = require("libp2p-secio")

module.exports = function SecioCrypto(protocol, zeronet, id) {
  protocol.crypto.add("secio", (conn, conf, cb) => {
    try {
      cb(null, libp2p_secio.encrypt(id, id.privKey, conn))
    } catch (e) {
      cb(e)
    }
  })
}
