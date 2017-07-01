"use strict"

const tls = require("tls")
const constants = require("constants")

/*const Duplex = require("stream").Duplex
const Transform = require("stream").Transform
const crypto = require("crypto")*/

const toPull = require("stream-to-pull-stream")
const toStream = require("pull-stream-to-stream")
const Id = require("peer-id")
const Peer = require('peer-info')
const libp2p_secio = require("libp2p-secio")
const Connection = require("interface-connection").Connection

const OpenSSLGenerator = require(__dirname + "/helper").OpenSSLGenerator

module.exports = function TLSSupport(self) {

  const log = self.log

  self.constants = constants

  //TODO: replace if true/false with options

  if (self.zeronet.config.id) {

    const def = {
      "id": "string"
    }
    self.handle("secioIdentify", def, def)

    const secio = (options, cb) => {
      let stream = self.getStream()
      const myid = self.zeronet.config.id
      let otherid

      const buildUp = () => {
        let conn
        if (stream.conn) {
          conn = stream.conn
        } else {
          log.error("Using unstable pull2stream2pull")
          const dupStream = toPull.duplex(stream)
          conn = new Connection(dupStream)
          conn.setPeerInfo(otherid)
        }
        const encPull = libp2p_secio.encrypt(myid, myid._privKey, conn, err => {
          console.log("lulz")
          if (err) return cb(err)
          else return cb(null, toStream(encPull))
        })
      }

      const getId = (b58, cb) => {
        const peerId = Id.createFromB58String(b58)
        Peer.create(peerId, (err, id) => {
          if (err) return cb(err)
          otherid = id
          return cb()
        })
      }

      if (options.isServer) {
        self.getMSG().once("secioIdentify", (otherb58, cb) => {
          getId(otherb58, err => {
            if (err) return cb(err)
            cb(null, myid.toB58String())
            buildUp()
          })
        })
      } else {
        self.secioIdentify(myid.toB58String(), (err, otherb58) => {
          if (err) return cb(err)
          getId(otherb58, err => {
            if (err) return cb(err)
            buildUp()
          })
        })
      }
    }

    self.crypto.add("secio", secio)

  }

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
  const gen = new OpenSSLGenerator()

  if (self.zeronet.config.tls != "disabled") { //well, now it seems to core dump. I think I screwed up the crypto.
    let rsa_cert
    let rsa_wait = []

    gen.rsa((err, res) => {
      if (err) throw err
      rsa_cert = res
      rsa_wait.forEach(wait => rsa_crypto(wait[0], wait[1]))
    })

    const rsa_crypto = (options, cb) => {
      let stream = self.getStream()
      log.debug({
        isServer: options.isServer
      }, "tls handshake init")
      if (options.isServer && !rsa_cert) return rsa_wait.push([options, cb])
      //close all streams and reopen/reint everything after adding a tls layer. and all that based on guesswork. fml.
      if (options.isServer) {
        stream = tls.connect({
          socket: stream,
          isServer: true,
          secureContext: tls.createSecureContext({
            key: rsa_cert.privkey,
            cert: rsa_cert.cert,
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
      cb(null, stream)
    }
    self.crypto.add("tls-rsa", rsa_crypto)
  }
}
