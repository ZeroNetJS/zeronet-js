"use strict"

const NAT = require("./nat")
const series = require("async/series")

//ZNv2 swarm using libp2p-transports

function dialables (tp, multiaddrs) {
  return tp.filter(multiaddrs)
}

function ZNV2Swarm(opt) {
  const self = this

  console.log(opt)

  self.advertise = {
    ip: null,
    port: null,
    port_open: null
  }
}
module.exports = ZNV2Swarm
