"use strict"

const tls = require("tls")
const net = require("net")

const toPull = require("stream-to-pull-stream")
const toStream = require("pull-stream-to-stream")
const Connection = require("interface-connection").Connection
const sslConfig = require('ssl-config')('modern')

const gen = require("zeronet-crypto/gen")

const debug = require("debug")
const log = debug("zeronet:crypto:tls")

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
    if (opt.isServer) {
      const next = () => {
        log("tls %s [server] prepare", type)
        const s = handler.server(cert, socket => {
          cb(null, new Connection(toPull.duplex(socket), conn))
        })
        s.on("error", cb)
        s.listen(e => {
          if (e) return cb(e)
          log("tls %s [server] start", type)
          log("tls %s [server] client.connecting", type)
          const client = net.connect(s.address(), e => {
            if (e) return cb(e)
            let stream = toStream(conn)
            stream.pipe(client).pipe(stream)
            log("tls %s [server] client.ready", type)
          })
          client.on("error", cb)
        })
      }
      if (cert) next()
      else certq.push(next)
    } else {
      log("tls %s [client] server.prepare", type)
      const s = net.createServer(socket => {
        let stream = toStream(conn)
        stream.pipe(socket).pipe(stream)
        s.close()
      })
      s.on("error", cb)
      s.listen(e => {
        if (e) return cb(e)
        log("tls %s [client] server.ready", type)
        log("tls %s [client] connect", type)
        const client = handler.client(s.address().host, s.address().port)
        client.on("error", cb)
        client.on("secureConnect", () => cb(null, new Connection(toPull.duplex(client), conn)))
      })
    }
  })
}

module.exports = function TLSSupport(protocol) {
  //module.exports.tls_ecc(protocol)
  module.exports.tls_rsa(protocol)
}

module.exports.tls_rsa = (protocol) => {
  basicCrypto("rsa", protocol, {
    server: (cert, onConnect) => {
      return tls.createServer({
        key: cert.key,
        cert: cert.cert,
        ciphers: sslConfig.ciphers,
        honorCipherOrder: true,
        secureOptions: sslConfig.minimumTLSVersion
      }, onConnect)
    },
    client: (host, port) => {
      return tls.connect({
        host,
        port,
        requestCert: true,
        rejectUnauthorized: false,
        ciphers: sslConfig.ciphers,
        honorCipherOrder: true,
        secureOptions: sslConfig.minimumTLSVersion
      })
    }
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
