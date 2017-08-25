"use strict"

const tls = require("tls")
const net = require("net")
const constants = require("constants")

const toPull = require("stream-to-pull-stream")
const toStream = require("pull-stream-to-stream")
const Connection = require("interface-connection").Connection

const gen = require("zeronet-crypto/gen")

const debug = require("debug")
const log = debug("zeronet:crypto:tls")

function pipeThroughNet(dup, cb) {
  const s = net.createServer((socket) => {
    s.emit("sock", socket)
  })
  s.on("error", cb)
  s.listen(e => {
    if (e) return cb(e)
    const client = net.connect(s.address())
    s.once("sock", socket => {
      dup.pipe(socket) //conn4server.out -> server.out -> client.in
      socket.pipe(dup) //client.out -> server.in -> conn2server.in
      cb(null, client)
    })
    client.on("error", cb)
  })
}

function basicCrypto(type, protocol, handler) {
  let cert = gen[type]()

  protocol.crypto.add("tls-" + type, (conn, opt, cb) => {
    log("tls init", type, opt)
    let stream = toStream(conn)
    pipeThroughNet(stream, (err, socket) => {
      if (err) return cb(err)

      let stream

      handler(opt, socket, cert, (err, _s) => {
        if (err) return cb(err)
        //socket.flow()
        stream = _s
        stream.on("error", e => cb(e))
        log("tls ready", type, opt)
      }, e => {
        if (e) cb(e)
        cb(null, new Connection(toPull.duplex(stream)))
      })

    })
  })
}

module.exports = function TLSSupport(protocol) {
  module.exports.tls_ecc(protocol)
  module.exports.tls_rsa(protocol)
}

module.exports.tls_rsa = (protocol) => {
  basicCrypto("rsa", protocol, (opt, socket, cert, ready, cb) => {
    let stream
    if (opt.isServer) {
      stream = new tls.TLSSocket(socket, {
        isServer: true,
        key: cert.privkey,
        cert: cert.cert,
        requestCert: false,
        rejectUnauthorized: false,
        ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:AES128-GCM-SHA256:AES128-SHA256:HIGH:" +
          "!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
        honorCipherOrder: true,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      })
      stream.on("secureConnect", () => cb())
    } else {
      stream = tls.connect(socket, {
        isServer: false,
        requestCert: true,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      }, cb)
    }
    ready(null, stream)
  })
}

module.exports.tls_ecc = (protocol) => {
  basicCrypto("ecc", protocol, (opt, socket, cert, ready, cb) => {
    let stream
    if (opt.isServer) {
      stream = new tls.TLSSocket(socket, {
        isServer: true,
        key: cert.privkey,
        cert: cert.cert,
        requestCert: false,
        rejectUnauthorized: false,
        ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:AES128-GCM-SHA256:AES128-SHA256:HIGH:" +
          "!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
        honorCipherOrder: true,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      })
      stream.on("secureConnect", () => cb())
    } else {
      stream = tls.connect(socket, {
        isServer: false,
        requestCert: true,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      }, cb)
    }
    ready(null, stream)
  })
}
