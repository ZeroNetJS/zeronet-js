"use strict"

const HandshakeClient = require("zeronet-client/lib/handshake")
const Client = require("zeronet-client")

const PeerRequest = require("peer-request")
const validate = require("zeronet-common/lib/verify").verifyProtocol
const PeerRequestHandler = require("zeronet-protocol/lib/request/peer-request-handler.js")

const Defaults = require("zeronet-protocol/lib/proto/defaults")
const Crypto = require("zeronet-crypto/protocol")
const debug = require("debug")

module.exports = function Protocol(swarm, node, zeronet, opt) {

  if (!opt) opt = {}

  let handlers = {}
  let commands = {}
  const self = this
  const log = debug("zeronet:protocol")

  self.getHandler = (name, client) => {
    if (!commands[name]) throw new Error("Unknown command " + name)
    return new PeerRequestHandler(name, commands[name], client, handlers[name])
  }

  function warnNoCrypto(addr) {
    if (zeronet.zeronet) { //why did we call common "zeronet"???
      zeronet.logger("protocol:handshake").warn("No crypto used in connection %s", addr[0])
    }
  }

  swarm.handle("/zn/2.0.0", (conn, cb) => {
    self.clientUpgrade(conn, conn.handshakeOPT, conn.handshake, cb ? cb : () => {})
  })

  self.clientUpgrade = (_conn, opt, handshake, cb) => {
    self.cryptoUpgrade(_conn, opt, handshake, (err, conn) => {
      if (err) return cb(err)
      conn.getObservedAddrs = _conn.getObservedAddrs
      conn.getPeerInfo = _conn.getObservedAddrs
      conn.handshake = handshake
      conn.handshakeOPT = opt
      conn.isLibp2p = _conn.isLibp2p
      conn.isEmu = _conn.isEmu
      cb(null, new Client(conn, self, zeronet, {
        isServer: opt.isServer,
        handshake: conn.handshake,
        crypto: conn.isLibp2p ? "secio" : self.crypto && handshake.commonCrypto() ? handshake.commonCrypto() : false
      }))
    })
  }

  self.cryptoUpgrade = (conn, opt, handshake, cb) => {
    if (conn.isLibp2p) {
      cb(null, conn)
    } else if (self.crypto && handshake.commonCrypto()) {
      self.crypto.wrap(handshake.commonCrypto(), conn, opt, (err, conn) => {
        if (err) return cb(err)
        else cb(null, conn)
      })
    } else {
      conn.getObservedAddrs((err, addr) => {
        if (err) return cb(err)
        warnNoCrypto(addr)
        cb(null, conn)
      })
    }
  }

  self.getHandlers = client => {
    let res = {}
    for (var name in commands)
      res[name] = self.getHandler(name, client)
    return res
  }

  self.handle = self.handleZN = (name, def, defret, cb) => {
    if (commands[name]) throw new Error(name + " is already handled")
    log("Handling", name)
    commands[name] = new PeerRequest(name, def, defret, validate)
    handlers[name] = cb
  }

  self.upgradeConn = opt =>
    (conn, cb) => {
      log("upgrading conn", opt)
      if (!cb) cb = (() => {})
      const c = conn.client = new HandshakeClient(conn, self, zeronet, Object.assign(opt))
      c.conn = conn.client
      c.upgrade((err, client) => {
        if (err) return cb(err)
        c.upgraded = client
        log("finished upgrade", opt)
        return cb(null, client)
      })
    }

  self.applyDefaults = () =>
    Defaults(self, zeronet, node)

  if (opt.crypto) {
    Crypto(self)
    if (!Array.isArray(opt.crypto)) opt.crypto = [opt.crypto]
    opt.crypto.map(c => c(self, zeronet))
  }

}
