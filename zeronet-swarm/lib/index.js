"use strict"

//2 swarms
//Libp2p on *:15542
//ZNv2 on *:15543
//don't ever put 2 swarms on the same port

//basics
const ZeroSwarm = require("./zero")
const Lp2pSwarm = require("./lp2p")
const series = require('async/series')

function ZeroNetSwarm(opt) {
  const self = this

  //libp2p
  if (!opt.libp2p) opt.libp2p = {}
  opt.libp2p.id = opt.id
  const lp2p = self.lp2p = self.libp2p = new Lp2pSwarm(opt.libp2p)

  //znv2
  if (!opt.zero) opt.zero = {}
  opt.zero.id = opt.id
  const zero = self.zero = new ZeroSwarm(opt.zero)

  self.start = cb => series([
    lp2p.start,
    zero.start
  ], cb)

  self.stop = cb => series([
    lp2p.stop,
    zero.stop
  ], cb)
}

module.exports = ZeroNetSwarm
module.exports.ZeroSwarm = ZeroSwarm
module.exports.Lp2pSwarm = Lp2pSwarm
