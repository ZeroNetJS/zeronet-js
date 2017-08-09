"use strict"

const tls = require("tls")
const net = require("net")
const constants = require("constants")

const toPull = require("stream-to-pull-stream")
const toStream = require("pull-stream-to-stream")
const Connection = require("interface-connection").Connection

const OpenSSLGenerator = require("zeronet-crypto/helper").OpenSSLGenerator

const debug = require("debug")
const log = debug("zeronet:crypto:tls")

function pipeThroughNet(dup, cb) {
  const s = net.createServer((socket) => {
    s.close()
    socket.on("data", console.log)
    socket.pause()
    s.emit("sock", socket)
  }).on("error", e => cb(e))

  s.listen(() => {
    const c = net.createConnection(s.address(), () => {})
    let flow = false
    let q = []
    dup.on("data", d => flow ? false : q.push(d))
    s.once("sock", socket => {
      socket.flow = () => {
        flow = true
        q.forEach(d => c.write(d))
        q = null
        dup.pipe(c).pipe(dup)
      }
      cb(null, socket)
    })
  })
}

function basicCrypto(type, protocol, handler) {
  const gen = new OpenSSLGenerator()

  let cert
  let wait = []

  gen[type]((err, res) => {
    if (err) throw new Error(err)
    cert = res
    wait.forEach(w => w())
    wait = null
  })

  protocol.crypto.add("tls-" + type, (conn, opt, cb) => {
    log("tls init", type, opt)
    let stream = toStream(conn)
    pipeThroughNet(stream, (err, socket) => {
      if (err) return cb(err)

      let stream

      const cont = () => {
        handler(opt, socket, cert, (err, _s) => {
          if (err) return cb(err)
          socket.flow()
          stream = _s
          stream.on("error", e => cb(e))
          log("tls ready", type, opt)
        }, e => {
          if (e) cb(e)
          cb(null, new Connection(toPull.duplex(stream)))
        })
      }

      if (opt.isServer && !cert) wait.push(cont)
      else cont()
    })
  })
}

module.exports = function TLSSupport(protocol) {
  module.exports.tls_ecc(protocol)
  module.exports.tls_rsa(protocol)
}

module.exports.tls_rsa = (protocol) => {
  basicCrypto("rsa", protocol, (opt, socket, rsa_cert, ready, cb) => {
    let stream
    if (opt.isServer) {
      stream = new tls.TLSSocket(socket, {
        isServer: true,
        key: rsa_cert.privkey,
        cert: rsa_cert.cert,
        requestCert: false,
        rejectUnauthorized: false,
        ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:AES128-GCM-SHA256:AES128-SHA256:HIGH:" +
          "!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
        honorCipherOrder: true,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      })
    } else {
      stream = new tls.TLSSocket(socket, {
        isServer: false,
        requestCert: true,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      })
    }
    stream.on("secureConnect", () => cb())
    ready(null, stream)
  })
}

module.exports.tls_ecc = (protocol) => {
  basicCrypto("ecc", protocol, (opt, socket, ecc_cert, ready, cb) => {
    let stream
    if (opt.isServer) {
      stream = new tls.TLSSocket(socket, {
        isServer: true,
        key: ecc_cert.privkey,
        cert: ecc_cert.cert,
        requestCert: false,
        rejectUnauthorized: false,
        ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:AES128-GCM-SHA256:AES128-SHA256:HIGH:" +
          "!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
        honorCipherOrder: true,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      })
    } else {
      stream = new tls.TLSSocket(socket, {
        isServer: false,
        requestCert: true,
        rejectUnauthorized: false,
        secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      })
    }
    stream.on("secureConnect", () => cb())
    ready(null, stream)
  })
}
