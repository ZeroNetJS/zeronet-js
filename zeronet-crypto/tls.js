"use strict"

const tls = require("tls")

const toPull = require("stream-to-pull-stream")
const Connection = require("interface-connection").Connection
const sslConfig = require('ssl-config')('modern')

const gen = require("zeronet-crypto/gen")

const debug = require("debug")
const log = debug("zeronet:crypto:tls")

const toSocket = require("pull-stream-to-net-socket")

function basicCrypto(type, protocol, handler) {
  let cert, certq = []
  gen[type]((err, _cert) => {
    cert = _cert
    log("got cert for %s queue %s", type, certq.length)
    certq.forEach(c => c())
    certq = null
  })

  protocol.crypto.add("tls-" + type, (conn, opt, cb) => {
    log("tls init", type, opt)
    const final = (err, client) => {
      log("tls success?", err ? true : err)
      if (err) return cb(err)
      cb(null, new Connection(toPull.duplex(client), conn))
    }
    if (opt.isServer) {
      const next = () => {
        toSocket(conn, {
          createServer: () => handler.server(cert),
          inverse: true,
          prefire: true
        }, final)
      }
      if (cert) next()
      else certq.push(next)
    } else {
      toSocket(conn, {
        createClient: dest => handler.client(dest),
        prefire: true
      }, final)
    }
  })
}

module.exports = function TLSSupport(protocol) {
  module.exports.tls_rsa(protocol)
  // module.exports.tls_ecc(protocol)
}

module.exports.tls_rsa = (protocol) => {
  basicCrypto("rsa", protocol, {
    server: (cert) => tls.createServer({
      key: cert.key,
      cert: cert.cert,
      ciphers: sslConfig.ciphers,
      honorCipherOrder: true,
      secureOptions: sslConfig.minimumTLSVersion
    }),
    client: (dest) => tls.connect(Object.assign(dest, {
      requestCert: true,
      rejectUnauthorized: false,
      ciphers: sslConfig.ciphers,
      honorCipherOrder: true,
      secureOptions: sslConfig.minimumTLSVersion
    }))
  })
}

/* TODO: fix and rewrite
module.exports.tls_ecc = (protocol) => {
  basicCrypto("ecc", protocol, (opt, host, port, cert, ready, cb) => {
    let stream
    if (opt.isServer) {
      stream = tls.connect({
        host,
        port,
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
    } else {
      stream = tls.connect({
        host,
        port,
        isServer: false,
        requestCert: true,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      }, cb)
    }
    stream.on("secureConnect", () => cb(null, stream))
    ready(null, stream)
  })
}
*/
