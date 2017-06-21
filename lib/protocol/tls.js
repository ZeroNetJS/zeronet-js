"use strict"

const tls = require("tls")
const constants = require("constants")
const path = require("path")

const msgpackstream = require(path.join(__dirname, "/../msgpack-stream"))

module.exports = function TLSSupport(self) {

  const log = self.log

  self.constants = constants

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

  if (false) self.crypto.add("tls-rsa", (options, cb) => {
    let stream = self.getStream()
    log.debug({
      isServer: options.isServer
    }, "tls handshake init")
    //close all streams and reopen/reint everything after adding a tls layer. and all that based on guesswork. fml.
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
    cb(null, stream)
  })
}
