"use strict"

//2 swarms
//Libp2p on *:15542
//ZNv2 on *:15543
//don't ever put 2 swarms on the same port

//basics
const ZeroSwarm = require("./zero")
const Lp2pSwarm = require("./lp2p")
const Dial = require("./dial")
const series = require('async/series')
const Protocol = require("zeronet-protocol")

function ZeroNetSwarm(opt, zeronet) {
  const self = this

  const protocol = self.protocol = new Protocol()

  //libp2p
  if (!opt.libp2p) opt.libp2p = {}
  opt.libp2p.id = opt.id
  const lp2p = self.lp2p = self.libp2p = new Lp2pSwarm(opt.libp2p, protocol, zeronet)

  //znv2
  if (!opt.zero) opt.zero = {}
  opt.zero.id = opt.id
  const zero = self.zero = new ZeroSwarm(opt.zero, protocol, zeronet, lp2p)

  self.start = cb => series([
    lp2p.start,
    zero.start
  ], cb)

  self.stop = cb => series([
    lp2p.stop,
    zero.stop
  ], cb)

  self.dial = Dial(zero, lp2p)

  protocol.setLp2p(lp2p)
  protocol.setZero(zero)
}

module.exports = ZeroNetSwarm
module.exports.ZeroSwarm = ZeroSwarm
module.exports.Lp2pSwarm = Lp2pSwarm
