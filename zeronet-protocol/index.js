const Client = require(__dirname + "/client")

const PeerRequest = require(__dirname + "/peer-request")
const PeerRequestHandler = require(__dirname + "/peer-request-handler")

const Defaults = require(__dirname + "/defaults")
const Crypto = require("zeronet-crypto/protocol")
const Crypto_secio = require("zeronet-crypto/secio")
const debug = require("debug")

module.exports = function Protocol(swarm, node, zeronet) {
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
    commands[name] = new PeerRequest(name, def, defret)
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

  self.applyDefaults = () => {
    Defaults(self, zeronet)
  }

  Crypto(self)
  Crypto_secio(self, zeronet)

}
