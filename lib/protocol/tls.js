"use strict"

const tls = require("tls")
const constants = require("constants")
const path = require("path")

const msgpackstream = require(path.join(__dirname, "/../msgpack-stream"))

module.exports = function TLSSupport(self) {

  const zeronet = self.zeronet
  const log = self.log

  let stream = self.getStream()
  let msg = self.getMSG()
  let handlers = self.handlers

  self.constants = constants

  let cryptSupported = ["tls-rsa"]

  /* live traffic
  {'cmd': 'handshake',
   'params': {'crypt': None,
              'crypt_supported': ['tls-rsa'],
              'fileserver_port': 15441,
              'peer_id': '-ZN0055-ohV0QYNHDyId',
              'port_opened': False,
              'protocol': 'v2',
              'rev': 2091,
              'target_ip': '217.234.60.22',
              'version': '0.5.5'},
   'req_id': 0}
  {'cmd': 'response',
   'crypt': 'tls-rsa',
   'crypt_supported': ['tls-rsa'],
   'fileserver_port': 15542,
   'peer_id': '-ZN0056-SS1oKxcjtyNW',
   'port_opened': None,
   'protocol': 'v2',
   'rev': 2109,
   'target_ip': '183.31.14.139',
   'to': 0,
   'version': '0.5.6'}
  */

  self.tlsUpgrade = function (options, cb, asy) {

    if (!asy) {
      stream.cork()
      return setTimeout(() => self.tlsUpgrade(options, cb, true), options.isServer ? 100 : 10)
    }
    log.debug({
      isServer: options.isServer
    }, "tls handshake init")
    //close all streams and reopen/reint everything after adding a tls layer. and all that based on guesswork. fml.
    //stream.removeAllListeners("data") //drains msgpack "stream"
    //const ostream = stream
    if (options.isServer) {
      const fs = require("fs") //this should actually be part of the options
      stream = tls.connect({
        socket: stream,
        isServer: true,
        secureContext: tls.createSecureContext({
          key: fs.readFileSync('./key.pem'),
          cert: fs.readFileSync('./cert.pem'),
          agent: false,
          isServer: true,
          requestCert: false,
          rejectUnauthorized: false,
          ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:AES128-GCM-SHA256:AES128-SHA256:HIGH:" +
            "!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
          honorCipherOrder: true,
          /* jshint ignore: start */
          secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
          /* jshint ignore: end */
        })
      })
      /*stream = tls.connect({
        socket: stream,
        requestCert: true,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      })*/
    } else {
      stream = tls.connect({
        socket: stream,
        requestCert: true,
        rejectUnauthorized: false,
        /* jshint ignore: start */
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
        /* jshint ignore: end */
      })
    }
    self.debugStream(stream)
    msg = new msgpackstream(stream)
    handlers.forEach(handler => {
      msg.on(handler.cmd, handler.handler)
    })
    self.postWrap(stream, msg)
    log("tls upgrade finished")
    stream.uncork()
    return cb()
  }

  const ohandshake = self.handshake

  if (zeronet.tls_disabled) {
    msg.on("handshake", (crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version, cb) => {
      //(crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version)
      log.warn("Skipping TLS handshake")
      cb(null, null, [], zeronet.server.port, zeronet.peer_id, false, "v2", zeronet.rev, "localhost", zeronet.version)
    })

    self.handshake = cb => cb(new Error("Disabled"))
  } else {
    msg.on("handshake", (crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version, cb) => {
      let crypto
      if (crypt) {
        crypto = crypt
      } else {
        if (protocol != "v2") return cb("Protocol unsupported") //TODO use offical error message
        const first_match = crypt_supported.filter(c => cryptSupported.indexOf(c) != -1)[0] //the first crypto we AND the client support
        if (!first_match) return cb("No common crypto") //TODO: use offical error or etc
        self.details.version = version
        self.details.peer_id = peer_id
        self.details.rev = rev
        //TODO: don't use fake values
        crypto = first_match
        //(crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version)
        cb(null, first_match, cryptSupported, zeronet.server.port, zeronet.peer_id, false, "v2", zeronet.rev, "localhost", zeronet.version)
      }
      self.tlsUpgrade({
        crypto,
        isServer: true
      }, err => {
        if (err) console.error("TLS ERROR", err.toString())
      })
    })

    self.handshake = function (cb) {
      //(crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version)
      ohandshake(null, cryptSupported, zeronet.server ? zeronet.server.port : 15441, zeronet.peer_id, false, "v2", zeronet.rev, "localhost", zeronet.version,
        (crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version) => {
          self.details.version = version
          self.details.peer_id = peer_id
          self.details.rev = rev
          self.tlsUpgrade({
            crypto: crypt,
            isServer: false
          }, err => {
            if (err) log.error("TLS ERROR", err.toString())
            return cb()
          })
        })
    }
  }
}
