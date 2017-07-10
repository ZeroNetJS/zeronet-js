"use strict"

const Tracker = require("bittorrent-tracker")
const crypto = require("crypto")
const sha1 = text => crypto.createHash('sha1').update(text).digest('hex')
module.exports = function ZeroNetTracker(zite, zeronet) {
  const client = new Tracker({
    infoHash: sha1(zite),
    peerId: zeronet.peer_id,
    announce: zeronet.config.trackers,
    port: zeronet.server ? zeronet.server.port : 25 //FIXME: that is wrong
  })

  client.complete()

  return client
}
