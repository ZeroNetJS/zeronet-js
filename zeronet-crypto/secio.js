"use strict"

const libp2p_secio = require("libp2p-secio")

module.exports = function SecioCrypto(protocol, zeronet) {
  protocol.crypto.add("secio", (conn, conf, cb) => {
    libp2p_secio.encrypt(zeronet.swarm.peerInfo.id, zeronet.swarm.peerInfo.id.privKey, conn, cb)
  })
}
