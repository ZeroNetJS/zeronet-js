"use strict"

const tls = require("tls")

const toPull = require("stream-to-pull-stream")
const Connection = require("interface-connection").Connection
const sslConfig = require("ssl-config")("modern")

const gen = require("zeronet-crypto/gen")

const debug = require("debug")
const log = debug("zeronet:crypto:tls")

const toSocket = require("pull-stream-to-net-socket")

const openssl = require("./openssl")

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
  /*if (openssl.supported()) module.exports.tls_ecc(protocol)
  else console.warn("tls_ecc currently requires openssl support")*/
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

module.exports.tls_ecc = (protocol) => {
  basicCrypto("ecc", protocol, {
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
