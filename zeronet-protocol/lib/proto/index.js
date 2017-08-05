const Client = require("zeronet-protocol/lib/client")

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
      const c = conn.client = new Client(conn, self, zeronet, Object.assign(opt))
      c.conn = conn.client
      const d = opt.isServer ? c.waitForHandshake : c.handshake
      d(err => {
        if (err) return cb(err)
        log("finished upgrade", opt)
        return cb(null, c)
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
