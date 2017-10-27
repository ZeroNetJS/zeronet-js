"use strict"

const cp = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")

const debug = require("debug")
const log = debug("zeronet:crypto:openssl")

const certRegex = /-----BEGIN ([A-Z ]+)-----\n([A-Za-z0-9+\/\n=]+)\n-----END ([A-Z ]+)-----/g

function getMatches(string, regex, indexes) {
  indexes = indexes || [1] // default to the first capturing group
  var matches = []
  var match
  while ((match = regex.exec(string)))
    matches.push(indexes.map(index => match[index]))
  return matches
}

function spawnOpenssl(args) {
  if (!args) args = []
  log("spawn openssl", args.join(" "))
  const p = cp.spawnSync("openssl", args, {
    cwd: os.tmpdir()
  })
  p.success = !p.error && !p.status
  log("openssl success?", p.success)
  if (!p.success) log(p.stderr.toString())
  p.failWithError = p.success ? () => {} : () => {
    throw new Error("OpenSSL ERROR: " + p.stderr.toString().replace(/\.\./g, ""))
  }
  return p
}

function getCerts(p, ex) {
  const o = {}
  getMatches(ex ? p.stdout.toString() + ex.toString() : p.stdout.toString(), certRegex, [1, 0]).forEach(m => o[m[0]] = m[1])
  return o
}

module.exports = {
  supported: () => spawnOpenssl().success,
  x509: () => {
    const keyfile = path.join(os.tmpdir(), "znjs-key-gen-" + Math.random())
    const cmd = "req -x509 -newkey rsa:2048 -subj /CN=localhost -keyout " + keyfile + " -sha256 -nodes -days 3650"
    let p = spawnOpenssl(cmd.split(" "))
    const certs = getCerts(p, fs.readFileSync(keyfile))
    fs.unlinkSync(keyfile)
    return {
      cert: Buffer.from(certs.CERTIFICATE).toString("hex"),
      key: Buffer.from(certs["PRIVATE KEY"]).toString("hex")
    }
  }
}
