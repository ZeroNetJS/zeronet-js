"use strict"

const tls = require("tls")
const constants = require("constants")
const cp = require("child_process")
const readline = require('readline')
const path = require("path")
const fs = require("fs")

const Readable = require("readable-stream")
const Writable = require("stream").Writable
/*const Duplex = require("stream").Duplex
const Transform = require("stream").Transform
const crypto = require("crypto")*/

const toPull = require("stream-to-pull-stream")
const toStream = require("pull-stream-to-stream")
const Id = require("peer-id")
const Peer = require('peer-info')
const libp2p_secio = require("libp2p-secio")
const Connection = require("interface-connection").Connection

const begin_regex = /-----BEGIN ([A-Z ]+)-----/
const end_regex = /-----END ([A-Z ]+)-----/

function KeyStream(stream) {
  let w, r
  if (!stream) {
    w = new Writable({
      write(chunk, encoding, callback) {
        r.emit("data", chunk)
        callback()
      }
    })
    r = new Readable({
      read() {}
    })
    stream = r
  }

  const rl = readline.createInterface({
    input: stream
  })
  let files = []
  let file
  rl.on("line", line => {
    switch (true) {
    case !!line.match(begin_regex):
      const m = line.match(begin_regex)
      file = {
        lines: [line],
        type: m[1].replace(/ /g, "_").toLowerCase()
      }
      break;
    case !!line.match(end_regex):
      file.lines.push(line)
      file.data = new Buffer(file.lines.join("\n"))
      files.push(file)
      file = null
      break;
    case !!file:
      file.lines.push(line)
      break;
    }
  })

  if (w) {
    w.keys = () => files
    return w
  } else {
    rl.keys = () => files
    return rl
  }
}

function OpenSSLGenerator() {
  function run(what, cb) {
    let args = ["openssl", what[0]].concat(what.slice(1)) //-keyout /dev/stdout -out /dev/stdout
    //console.log("+", args.join(" "))
    const keys = KeyStream()
    const p = cp.spawn("/usr/bin/env", args, {
      stdio: ["ignore", "pipe", "pipe"]
    })
    p.stdout.pipe(keys)
    //;["stdout", "stderr"].forEach(s => p[s].on("data", d => console.log(s, d.toString())))
    let serr = []
    p.stderr.on("data", data => serr.push(data))
    p.on("exit", (ex, sig) => {
      serr = Buffer.concat(serr).toString().replace(/\u0000/g, "").replace(/\n/g, "+").replace(/[.+][.+]/g, "")
      if (ex || sig) return cb(new Error("OpenSSL Error: " + (ex || sig)) + " (out: " + serr + ")")
      let key = keys.keys()
      if (!key.length) return cb(new Error("OpenSSL Error: No data returned (out: " + serr + ")"))
      return cb(null, key)
    })
  }

  const tmpfile = "/tmp/__zn_cert_tmp_" + process.pid + Math.random()
  const certdefault = "-new -key $TMP -batch -nodes -config".replace("$TMP", tmpfile).split(" ").concat([path.join(__dirname, "..", "..", "cert.conf")])

  function gen(opt, cb) {
    run(["gen" + opt.keytype, opt.keylength], (err, _privkey) => {
      if (err) return cb(err)
      const privkey = _privkey[0].data
      fs.writeFileSync(tmpfile, privkey)
      run(opt.cert.concat(certdefault), (err, _cert) => {
        fs.unlinkSync(tmpfile)
        if (err) return cb(err)
        const cert = _cert[0].data
        return cb(null, {
          privkey,
          cert
        })
      }, privkey)
    })
  }

  function GenKey(opt, cb) {
    run(["gen" + opt.keytype, opt.keylength], cb)
  }

  function rsa(cb) {
    gen({
      keytype: "rsa",
      keylength: 2048,
      cert: "req -x509 -sha256".split(" ")
    }, cb)
  }

  this.rsa = rsa
  this.gen = gen
  this.genkey = GenKey
}

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
        const dupStream = toPull.duplex(stream)
        const conn = new Connection(dupStream)
        conn.setPeerInfo(otherid)
        const encPull = libp2p_secio.encrypt(myid, myid._privKey, conn, err => {
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
