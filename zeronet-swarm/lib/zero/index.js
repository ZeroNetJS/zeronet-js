"use strict"

const NAT = require("./nat")
const multiaddr = require("multiaddr")

const debug = require("debug")
const log = debug("zeronet:swarm:zero")
const series = require("async/series")

//Parts
const TRANSPORT = require("./transport")
const DIAL = require("./dial")
const ZProtocol = require("zeronet-protocol").Zero

//ZNv2 swarm using libp2p transports

function ZNV2Swarm(opt, protocol, zeronet, lp2p) {
  const self = this
  self.proto = self.protocol = new ZProtocol({
    crypto: opt.crypto,
    id: opt.id
  }, zeronet)

  log("creating zeronet swarm")

  const tr = self.transport = {}
  self.multiaddrs = (opt.listen || []).map(m => multiaddr(m));

  (opt.transports || []).forEach(transport => {
    tr[transport.tag || transport.constructor.name] = transport
    if (!transport.listeners)
      transport.listeners = []
  })

  TRANSPORT(self)
  DIAL(self, lp2p)

  self.advertise = {
    ip: null,
    port: null,
    port_open: null
  }

  let nat
  if (opt.nat) nat = self.nat = new NAT(self, opt)

  self.start = cb => series([
    self.listen,
    nat ? nat.doDefault : cb => cb()
  ], cb)

  self.stop = cb => series([
    self.unlisten
  ], cb)

}
module.exports = ZNV2Swarm
