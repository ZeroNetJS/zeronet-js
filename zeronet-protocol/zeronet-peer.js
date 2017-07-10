"use strict"

const crypto = require("crypto")

const sha5 = text => crypto.createHash('sha512').update(text).digest('hex')
const multiaddr = require("multiaddr")
const Id = require("peer-id")
const Peer = require("peer-info")

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const bs58 = require('base-x')(BASE58)

const ip = require("ip")
const assert = require("assert")

const debug = require("debug")
const log = debug("zeronet:peer")

function ip2multi(ip, proto) {
  const i = ip2multi.split(ip)
  return "/ip" + i.v + "/" + ip.ip + "/" + proto + "/" + ip.port + "/"
}

ip2multi.split = ipHost => {
  const s = ipHost.split(":")
  assert.equal(s.length, 2, "not host:port")
  let r = {
    ip: s[0],
    port: parseInt(s[1], 10)
  }
  assert(!isNaN(r.port), "not a valid port")
  assert(ip.isV4Format(r.ip) || ip.isV6Format(r.ip), "not a valid ip")
  if (ip.isV4Format(r.ip)) r.v = 4
  else if (ip.isV6Format(r.ip)) r.v = 6
}

ip2multi.isIp = ipHost => {
  try {
    ip2multi.split(ipHost)
    return true
  } catch (e) {
    return false
  }
}

function multi2ip(multi) {
  const s = multi.split("/")
  s.shift()
  return s[1] + ":" + s[3]
}

function ZitePeerInfo(addr) {
  const self = this
  let opt = self.optional = []

  function setHashfield(hf) {
    //TODO: add
  }

  self.zite = addr
}

module.exports = function ZeroNetPeer(peerInfo) {
  const self = this
  assert(Peer.isPeerInfo(peerInfo), "not a peerInfo")
  const pi = self.info = peerInfo

  self.id = pi.id.toB58String()
  assert.equal(pi.multiaddrs.length, "peer must have exactly 1 address for now")
  self.multiaddr = pi.multiaddrs[0].toString()
  self.addr = multi2ip(self.multiaddr)

  log("creating", self.multiaddr)

  let known_zites = self.known_zites = []

  function setZite(zite) {
    if (hasZite(zite)) return
    known_zites.push(new ZitePeerInfo(zite))
  }

  function hasZite(zite) {
    return known_zites.filter(z => z.zite == zite)[0]
  }

  self.setZite = setZite
  self.hasZite = hasZite
}

module.exports.piFromAddr = (pi, cb) => {
  if (Peer.isPeerInfo(pi)) {
    return cb(null, pi)
  }

  if (ip2multi.isIp(pi)) {
    pi = multiaddr(ip2multi(pi, "tcp"))
  }

  if (multiaddr.isMultiaddr(pi)) {
    const ad = pi.toString()
    const md = pi
    let pid = Id.createFromB58String("Q" + bs58.encode(sha5(ad).substr(0, 34)))
    Peer.create(pid, (err, pi) => {
      if (err) return cb(err)
      pi.multiaddrs.add(md)
      return cb(null, pi)
    })
  } else throw new Error("Not a valid ip:port, multiaddr or peerInfo")
}

module.exports.fromAddr = (pi, cb) => {
  module.exports.piFromAddr(pi, (err, info) => {
    if (err) return cb(err)
    return cb(null, new module.exports(pi))
  })
}
