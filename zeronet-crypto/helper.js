"use strict"

const cp = require("child_process")
const readline = require('readline')
const path = require("path")
const fs = require("fs")

const Readable = require("readable-stream")
const Writable = require("stream").Writable

const begin_regex = /-----BEGIN ([A-Z ]+)-----/
const end_regex = /-----END ([A-Z ]+)-----/

/**
  Internal class for KeyStream
  * @param {stream} stream - The stream to read from
  * @private
  */
function KeyStreamClass(stream) {
  var w, r
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
  var files = []
  var file
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

  this.rl = rl
  this.w = w
  this.get = () => files
}

/**
 * Reads keys from a stream
 * Returns a new stream if no stream was given
 * @param {stream} stream - Optional stream to read from
 * @return {stream} - Stream with a .keys() function to read the keys after the end event
 */
function KeyStream(stream) {
  const key = new KeyStreamClass(stream)

  if (key.w) {
    key.w.keys = key.get
    return key.w
  } else {
    key.rl.keys = key.get
    return key.rl
  }
}

/**
  Generates keys and certificates using the openssl binary
  * @namespace OpenSSLGenerator
  * @constructor
  */
function OpenSSLGenerator() {
  /**
  * @namespace OpenSSLGenerator
  */
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
      process.nextTick(() => {
        serr = Buffer.concat(serr).toString().replace(/\u0000/g, "").replace(/\n/g, "+").replace(/[.+][.+]/g, "")
        if (ex || sig) return cb(new Error("OpenSSL Error: " + (ex || sig)) + " (out: " + serr + ")")
        let key = keys.keys()
        if (!key.length) return cb(new Error("OpenSSL Error: No data returned (out: " + serr + ")"))
        return cb(null, key)
      })
    })
  }

  const tmpfile = "/tmp/__zn_cert_tmp_" + process.pid + Math.random()
  const certdefault = "-new -key $TMP -batch -nodes -config".replace("$TMP", tmpfile).split(" ").concat([path.join(__dirname, "cert.conf")])

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

module.exports = {
  KeyStream,
  OpenSSLGenerator
}
