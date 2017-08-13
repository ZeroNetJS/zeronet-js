"use strict"

const PeerRequest = require("peer-request")
const validate = require("zeronet-common/lib/verify").verifyProtocol
const PeerRequestHandler = require("zeronet-protocol/lib/request/peer-request-handler")

function genHandshakeData(protocol, client, zeronet) {
  let d = {
    crypt: null,
    crypt_supported: protocol.crypto ? protocol.crypto.supported() : [],
    fileserver_port: zeronet.swarm.advertise.port || 0,
    protocol: "v2",
    port_opened: zeronet.swarm.advertise.port_open || false,
    rev: zeronet.rev,
    version: zeronet.version,
    libp2p_support: true,
    own: true //this marks our own handshake. required for linking
  }
  if (client.isTor) {
    d.onion = 0 //TODO: add tor
  } else {
    d.peer_id = zeronet.peer_id
    d.target_ip = zeronet.swarm.advertise.ip || "0.0.0.0"
  }
  return d
}

function Handshake(data) {
  const self = this

  for (var p in data) {
    self[p] = data[p]
  }

  function addCMD(name, fnc, needOwn) {
    self[name] = function () {
      if (!self.linked && needOwn) throw new Error("No handshake linked")
      if (self.linked && needOwn && !self.own) return self.linked[name].apply(self.linked, arguments)
      return fnc.apply(self.linked, arguments)
    }
  }

  self.link = (h2, r) => {
    self.linked = h2
    if (!r) h2.link(self, true)
    delete self.link
  }

  self.toJSON = () => {
    const r = {}
    for (var p in module.exports.def)
      r[p] = self[p]
    return r
  }

  addCMD("commonCrypto", () => self.crypt_supported.filter(c => self.linked.crypt_supported.indexOf(c) != -1)[0], true)
  addCMD("hasLibp2p", () => self.libp2p_support && self.linked.libp2p_support, true)
}

const debug = require("debug")

module.exports = function ZeroNetHandshake(client, protocol, zeronet, opt) {

  const log = debug("zeronet:protocol:handshake")

  let waiting = []

  function handshakeComplete(err, opt) {
    //console.log(waiting,opt,new Error("."))
    if (!Array.isArray(waiting)) throw new Error("HandshakeError: Complete called multiple times")
    waiting.forEach(w => w(err, client.handshakeData, client._opt = opt))
    waiting = err
  }

  function handshakeInit(cb) {
    log("Start handshake", opt)
    const handshake = new Handshake(genHandshakeData(protocol, client, zeronet))

    client.cmd.handshake(handshake.toJSON(), (err, data) => {
      if (err) {
        handshakeComplete(err)
        return cb(err)
      }
      const remoteHandshake = new Handshake(data)

      handshake.link(remoteHandshake)

      client.handshakeData = handshake
      client.remoteHandshake = remoteHandshake

      log("Finished handshake", opt)
      handshakeComplete(null, {
        isServer: false
      })
      return cb(null, handshake, {
        isServer: false
      })

    })
  }

  function handshakeGet(data, cb) {
    log("Got handshake", opt)
    const handshake = new Handshake(genHandshakeData(protocol, client, zeronet))
    const remoteHandshake = new Handshake(data)
    handshake.link(remoteHandshake)
    handshake.crypt = protocol.crypto && handshake.commonCrypto() ? handshake.commonCrypto() : null
    cb(null, handshake.toJSON())
    client.handshakeData = handshake
    client.remoteHandshake = remoteHandshake
    log("Finished handshake", opt)
    handshakeComplete(null, {
      isServer: true
    })
  }

  log("use handshake", opt)

  client.handshake = handshakeInit

  client.waitForHandshake = cb => {
    if (Array.isArray(waiting)) waiting.push(cb)
    else cb(waiting, client.handshakeData, client._opt)
  }

  return new PeerRequestHandler("handshake", module.exports.req, client, handshakeGet)
}

module.exports.def = { //Definitions are symmetric
  crypt: [a => a === null, "string"],
  crypt_supported: Array.isArray,
  fileserver_port: "number",
  peer_id: "string",
  port_opened: "boolean",
  protocol: "string",
  rev: "number",
  target_ip: "string",
  version: "string",
  libp2p_support: [a => a === undefined, "boolean"]
}

module.exports.req = new PeerRequest("handshake", module.exports.def, module.exports.def, validate)
