const HandshakeClient = require("zeronet-client/lib/handshake")

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

  self.getHandlers = client => {
    let res = {}
    for (var name in commands)
      res[name] = self.getHandler(name, client)
    return res
  }

  self.handle = (name, def, defret, cb) => {
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
