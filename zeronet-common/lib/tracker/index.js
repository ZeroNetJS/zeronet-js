"use strict"

const Tracker = require("bittorrent-tracker")
const crypto = require("crypto")
const sha1 = text => crypto.createHash('sha1').update(text).digest()
module.exports = function ZeroNetTracker(zite, zeronet) {
  const client = new Tracker({
    infoHash: sha1(zite),
    peerId: new Buffer(zeronet.peer_id),
    announce: zeronet.config.trackers,
    port: zeronet.server ? zeronet.server.port : "0" //FIXME: this code won't work as the server is now in the swarm
  })

  return client
}
