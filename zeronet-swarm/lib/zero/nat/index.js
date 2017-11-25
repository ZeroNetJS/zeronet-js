"use strict"

const upnp = require("nat-upnp")
const request = require("request")
const series = require("async/series")

const debug = require("debug")
const log = debug("zeronet:swarm:nat")

const rminmax = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)

function cbTimeout(ar, opt, callback) {
  let cbf = false
  let errs = []
  const cb = (err, res) => {
    if (cbf) return
    if (err) {
      errs.push(err)
      if (errs.length > ar.length) {
        cbf = true
        return callback(new Error("No valid result"))
      } else if (err.toString().split("\n")[0] == "Error: Timeout") {
        cbf = true
        return callback(err)
      }
    } else {
      cbf = true
      return callback(err, res)
    }
  }
  ar.forEach(fnc => opt ? fnc(opt, cb) : fnc(cb))
  setTimeout(cb, 2500, new Error("Timeout"))
}

/* getExternalIP */

function IPmyipis() {
  const self = this
  self.getIP = cb => {
    request("http://myip.is", (err, _, body) => {
      if (err) return cb(err)
      const m = body.match(/title="copy ip address">(\d+\.\d+\.\d+\.\d+)<\/a>/)
      if (!m) return cb(new Error("Invalid response"))
      return cb(null, m[1])
    })
  }
}

function IPupnp(client) {
  const self = this
  self.getIP = client.externalIp.bind(client)
}

/* getPortOpen */

function PORTportcheckerco() {
  const self = this
  self.getPortOpen = (port, cb) => {
    request({
      url: "https://portchecker.co/check",
      method: "POST",
      body: "port=" + port
    }, (err, _, body) => {
      if (err) return cb(err)
      const m = body.match(/Port \d+ is <span class=".+">([a-z]+)<\/span>/i)
      if (!m) return cb(new Error("Invalid response"))
      return cb(null, m[1] == "open")
    })
  }
}

/*function PORTcanyouseemeorg() {
  const self = this
  self.getPortOpen = (port, cb) => {
    return //TODO: fix this checker
    request({
      url: "http://canyouseeme.org/",
      method: "POST",
      body: "port=" + port,
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:54.0) Gecko/20100101 Firefox/54.0"
      }
    }, (err, _, body) => {
      if (err) return cb(err)
      console.log("res", body)
    })
  }
}*/

module.exports = function NatBroker(swarm, swarmopt) {
  const self = this

  const upclient = upnp.createClient()
  const getIP = [
    new IPupnp(upclient),
    new IPmyipis()
  ]
  const getPort = [
    new PORTportcheckerco(),
    //new PORTcanyouseemeorg()
  ]

  self.getIP = cb => cbTimeout(getIP.map(c => c.getIP), null, cb, log("getting external ip"))
  self.getPortOpen = (port, cb) => cbTimeout(getPort.map(c => c.getPortOpen), port, cb, log("testing if port %s is open", port))

  self.forwardIP = upclient.portMapping

  self.getAdvIP = cb => {
    self.getIP((err, ip) => {
      if (err) {
        log("failed")
        swarm.advertise.ip = "0.0.0.0"
        return cb(err)
      }
      let s = ip.split(/[:\.]/g)
      let l = s.pop()
      log("ip: " + s.map(s => "X".repeat(s.length)).concat([l]).join("."))
      swarm.advertise.ip = ip
      return cb(null, ip)
    })
  }

  self.freePort = cb => {
    let d = {}
    let ports = (swarmopt.listen || []).map(ma => parseInt(ma.split("/").slice(-1)[0], 10)).filter(p => {
      const r = !d[p]
      d[p] = true
      return r
    })
    log("forwarding port(s)", ports)
    if (!ports.length) {
      log("no ports listening")
      swarm.advertise.port = 0
      swarm.advertise.port_open = false
      return cb()
    }

    function forEachPort() {
      let port = ports.shift()
      if (!port) return cb()
      let eport = port

      function forward(cb) {
        log("forwarding %s", port)
        upclient.portMapping({
          private: port,
          public: port,
          ttl: 100
        }, err => {
          if (err) {
            eport = rminmax(10000, 30000)
            log("direct mapping failed. trying random port", eport)
            upclient.portMapping({
              private: port,
              public: eport,
              ttl: 100
            }, err => {
              if (err) {
                log("no luck")
                return cb(err)
              } else return cb()
            })
          } else return cb()
        })
      }

      function verifyIsOpen(cb) {
        self.getPortOpen(eport, cb)
      }

      verifyIsOpen((err, res) => {
        const next = () => {
          verifyIsOpen((err, res) => {
            if (err) {
              log("couldn't verify port is open")
              swarm.advertise.port_open = false
              return cb(err)
            } else {
              swarm.advertise.port_open = res
              log("port open", res)
              return cb()
            }
          })
        }
        if (err || !res) {
          forward(err => {
            swarm.advertise.port = eport
            if (err) {
              swarm.advertise.port_open = false
              return cb(err)
            } else {
              next()
            }
          })
        } else {
          swarm.advertise.port_open = res
          log("port open", res)
          return cb()
        }
      })
    }
    forEachPort()
  }

  self.doDefault = cb => series([
    cb => self.getAdvIP(() => cb()),
    cb => self.freePort(() => cb())
  ], cb)
}
