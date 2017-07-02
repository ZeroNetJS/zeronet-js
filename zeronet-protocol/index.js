const Client = require(__dirname + "/client")

const PeerRequest = require(__dirname + "/peer-request")

const Defaults = require(__dirname + "/defaults")

module.exports = function Protocol(swarm, node, zeronet) {
  let handlers = {}
  let requests = {}
  const self = this

  self.getHandler = name => {
    if (!handlers[name]) throw new Error("No handler for command " + name)
  }

  self.handle = (name, def, defret, cb) => {
    requests[name] = new PeerRequest(name, def, defret)
    handlers[name] = cb
  }

  self.upgradeConn = (conn, cb) => {
    const c = new Client(conn, self, zeronet)
    if (cb) return cb(null, c)
  }

  self.applyDefaults = () => {
    Defaults(self, zeronet)
  }

}
