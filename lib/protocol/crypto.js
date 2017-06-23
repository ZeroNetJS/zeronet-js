"use strict"

const path = require("path")

const msgpackstream = require(path.join(__dirname, "/../msgpack-stream"))

function Crypto(opt) {
  const self = this
  self.name = opt.name
  self.getSocket = opt.wrapper
}

module.exports = function ZeroNetCrypto(self) {
  function ZeroNetCrypto() {
    self.cryptos = []
    const me = this
    const log = self.logger("crypto")

    me.index = {}

    me.add = (name, wrapper) => {
      log.debug({
        op: "crypto-add",
        crypto: name
      }, "Adding crypto %s", name)
      if (me.index[name]) throw new Error("Already registered " + name)
      const c = new Crypto({
        name,
        wrapper
      })
      self.cryptos.push(c)
      me.index[name] = c
    }

    const disabled = {}

    me.supported = () =>
      self.cryptos.filter(c => !disabled[c.name]).map(c => c.name)

    me.wrap = (crypto, conf, cb) => {
      if (!crypto) return cb()
      if (!me.index[crypto]) return cb(new Error("Unsupported crypto " + crypto))
      log({
        op: "upgrade-crypto",
        crypto
      }, "Upgrading to crypto %s", crypto)
      me.index[crypto].getSocket(conf, (err, socket) => {
        if (err) return cb(err)
        self.debugStream(socket)
        let msg = new msgpackstream(socket)
        self.handlers.forEach(handler => {
          msg.on(handler.cmd, handler.handler)
        })
        self.postWrap(socket, msg)
      })
    }

    me.disable = crypto => {
      if (!me.index[crypto]) throw new Error("Unsupported crypto " + crypto)
      if (disabled[crypto]) throw new Error(crypto + "is already disabled")
      log({
        op: "disable-crypto",
        crypto
      }, "Disabling crypto %s", crypto)
      disabled[crypto] = true
    }
  }
  self.crypto = new ZeroNetCrypto()
}
