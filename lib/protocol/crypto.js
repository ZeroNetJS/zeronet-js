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
  }
  self.crypto = new ZeroNetCrypto()
}
