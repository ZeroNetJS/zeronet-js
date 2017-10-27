"use strict"

const forge = require("node-forge")
const debug = require("debug")
const log = debug("zeronet-crypto:gen")
const pki = forge.pki
const openssl = require("./openssl")

const attrs = [{
  name: 'commonName',
  value: 'Example Company'
}, {
  name: 'countryName',
  value: 'US'
}, {
  shortName: 'ST',
  value: 'Virginia'
}, {
  name: 'localityName',
  value: 'New York'
}, {
  name: 'organizationName',
  value: 'Example, LLC'
}, {
  shortName: 'OU',
  value: 'Test'
}]

const certSet = [{
  name: 'basicConstraints',
  cA: true
}, {
  name: 'keyUsage',
  keyCertSign: true,
  digitalSignature: true,
  nonRepudiation: true,
  keyEncipherment: true,
  dataEncipherment: true
}, {
  name: 'extKeyUsage',
  serverAuth: true,
  clientAuth: true,
  codeSigning: true,
  emailProtection: true,
  timeStamping: true
}, {
  name: 'nsCertType',
  client: true,
  server: true,
  email: true,
  objsign: true,
  sslCA: true,
  emailCA: true,
  objCA: true
}, {
  name: 'subjectAltName',
  altNames: []
}, {
  name: 'subjectKeyIdentifier'
}]

function validate(what, fields) {
  if (!what) throw new Error("Invalid! Value is false!")
  fields.forEach(field => {
    const v = what[field]
    if (!v || !v.trim()) throw new Error("Invalid! Field " + field + " is empty!")
    if (typeof v != "string") throw new Error("Invalid! Field " + field + " is not a string!")
  })
  return what
}

function rsa() { //x509 2k rsa cert
  // generate a keypair and create an X.509v3 certificate
  var keys = pki.rsa.generateKeyPair(2048)
  var cert = pki.createCertificate()
  cert.publicKey = keys.publicKey
  // NOTE: serialNumber is the hex encoded value of an ASN.1 INTEGER.
  // Conforming CAs should ensure serialNumber is:
  // - no more than 20 octets
  // - non-negative (prefix a '00' if your value starts with a '1' bit)
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions(certSet)
  // self-sign certificate
  cert.sign(keys.privateKey)

  // convert a Forge certificate to PEM
  var pem = pki.certificateToPem(cert)

  return validate({
    cert: new Buffer(pem).toString("hex"),
    key: new Buffer(pki.privateKeyToPem(keys.privateKey)).toString("hex")
  }, ["cert", "key"])
}

function rsa_fast() { //openssl is A LOT faster
  try {
    return validate(openssl.x509(), ["cert", "key"])
  } catch (e) {
    log("rsa_fast fail, use default")
    log(e)
    try {
      return rsa()
    } catch (en) {
      throw e
    }
  }
}

const cp = require("child_process")

let w, q
const Queue = require("data-queue")

function spawnWorker(cb) {
  log("spawning worker")
  const env = Object.assign({}, process.env)
  env.IS_TLS_GEN_WORKER = 1
  w = cp.fork(__filename, {
    env,
    stdio: "inherit"
  })
  w.once("message", m => cb(!m.ready))
}

function doTask(t) {
  return cb => {
    if (!q) {
      q = Queue()
      spawnWorker(err => {
        q.error(err)
        if (err) {
          q = null
          return cb(err)
        }

        function gloop() {
          const t = setTimeout(() => {
            q.error(true)
            w.send({
              type: "die"
            })
            w = null
            q = null
          }, 1000)
          q.get((e, d) => {
            if (e) return
            clearTimeout(t)
            w.send({
              type: "gen",
              key: d.t
            })
            log("sending work to worker")
            w.once("message", m => {
              log("work finished")
              if (m.r) {
                for (var p in m.r)
                  m.r[p] = Buffer.from(m.r[p], "hex")
                d.cb(null, m.r)
              } else if (m.err) {
                const e = new Error("Keygen failed")
                e.stack = m.err
                d.cb(e)
              }
              gloop()
            })
          })
        }
        gloop()

        log("adding task for %s to new worker", t)
        if (q.append({
            cb,
            t
          })) return cb(q.append())
      })

    } else {
      log("adding task for %s to existing worker", t)
      if (q.append({
          cb,
          t
        })) return cb(q.append())
    }
  }
}

if (!process.env.IS_TLS_GEN_WORKER) {
  module.exports.rsa = doTask("rsa")
} else {
  const types = openssl.supported() ? {
    rsa,
    rsa_fast
  } : {
    rsa
  }
  process.send({
    ready: true
  })
  process.on("message", (msg) => {
    if (msg.type == "die") {
      log("worker: exiting")
      process.exit(0)
    } else if (msg.type == "gen") {
      if (types[msg.key + "_fast"]) msg.key += "_fast"
      log("worker: doing work %s", msg.key)
      try {
        process.send({
          r: types[msg.key]()
        })
        log("worker: work success")
      } catch (e) {
        log("worker: work failed")
        process.send({
          e: e.stack
        })
      }
    }
  })
}
