"use strict"

const Tracker = require("bittorrent-tracker")
const crypto = require("crypto")
const sha1 = text => crypto.createHash('sha1').update(text).digest('hex')
module.exports = function ZeroNetTracker(zite, zeronet) {
  const client = new Tracker({
    infoHash: sha1(zite.address),
    peerId: zeronet.peer_id,
    announce: zeronet.trackes,
    port: zeronet.server ? zeronet.server.port : null
  })

  client.complete()

  return client
}
