"use strict"

function genHandshakeData(client, zeronet) {
  let d = {
    crypt: null,
    crypt_supported: client.crypto.supported(),
    fileserver_port: zeronet.server ? zeronet.server.port : 0,
    protocol: "v2",
    port_opened: false, //TODO: implent
    rev: zeronet.rev,
    version: zeronet.version,
    target_ip: "127.0.0.1", //TODO: add
    own: true //this is later removed
  }
  if (client.isTor) {
    d.onion = 0 //TODO: add tor
  } else {
    d.peer_id = zeronet.peer_id
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

  addCMD("commonCrypto", () => self.crypt_supported.filter(c => self.linked.crypt_supported.indexOf(c) != -1)[0], true)

}

module.exports = function ZeroNetHandshake(self) {

  const log = self.logger("handshake")

  function handshakeInit(cb) {
    log.debug("Start handshake")
    const handshake = new Handshake(genHandshakeData(self, self.zeronet))

    self._handshake(handshake, (err, data) => {
      if (err) return cb(err)
      const remoteHandshake = new Handshake(data)

      handshake.link(remoteHandshake)

      self.crypto.wrap(handshake.commonCrypto(), {
        isServer: false
      }, err => {
        if (err) return cb(err)
        self.handshakeData = handshake
        self.remoteHandshake = remoteHandshake
        log.debug("Finished handshake")
        return cb(null, handshake)
      })

    })
  }

  function handshakeGet(data, cb) {
    log.debug("Got handshake")
    const handshake = new Handshake(genHandshakeData(self, self.zeronet))
    const remoteHandshake = new Handshake(data)
    cb(null, handshake)
    handshake.link(remoteHandshake)
    self.handshakeData = handshake
    self.remoteHandshake = remoteHandshake
    self.crypto.wrap(handshake.commonCrypto(), {
      isServer: true
    }, err => {
      if (err) log.error(err, "Handshake error")
      log.debug("Finished handshake")
    })
  }

  const def = { //Definitions are symmetric
    crypt: a => a === null || typeof a == "string",
    crypt_supported: Array.isArray,
    fileserver_port: "number",
    peer_id: "string",
    port_opened: "boolean",
    protocol: "string",
    rev: "number",
    target_ip: "string",
    version: "string",
  }

  self.handle("handshake", def, def, {
    data: true,
    clientHandle: handshakeInit,
    serverHandle: handshakeGet
  })
}
