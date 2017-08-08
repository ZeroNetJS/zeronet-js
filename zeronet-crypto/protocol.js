"use strict"

const debug = require("debug")

function Crypto(opt) {
  const self = this
  self.name = opt.name
  self.getSocket = opt.wrapper
}

module.exports = function ZeroNetCrypto(protocol) {
  function ZeroNetCrypto() {
    protocol.cryptos = []
    const me = this
    const log = debug("zeronet:crypto")

    me.index = {}

    me.add = (name, wrapper) => {
      log("adding crypto", name)
      if (me.index[name]) throw new Error("Already registered " + name)
      const c = new Crypto({
        name,
        wrapper
      })
      protocol.cryptos.push(c)
      me.index[name] = c
    }

    const disabled = {}

    me.supported = () =>
      protocol.cryptos.filter(c => !disabled[c.name]).map(c => c.name)

    me.wrap = (crypto, client, conf, cb) => {
      if (!cb) throw new Error("No CB")
      if (!crypto) return cb(null, client)
      if (!me.index[crypto]) return cb(new Error("Unsupported crypto " + crypto))
      log("upgrading to crypto", crypto)
      client.getRaw((err, conn) => {
        if (err) return cb(err)
        me.index[crypto].getSocket(conn, conf, (err, conn) => {
          if (err) return cb(err)
          log("crypto finished", conf)
          return cb(null, conn)
        })
      })
    }

    me.disable = crypto => {
      if (!me.index[crypto]) throw new Error("Unsupported crypto " + crypto)
      if (disabled[crypto]) throw new Error(crypto + "is already disabled")
      log("disabling crypto", crypto)
      disabled[crypto] = true
    }
  }
  protocol.crypto = new ZeroNetCrypto()
}
