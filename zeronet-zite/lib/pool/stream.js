"use strict"

const EE = require("events").EventEmitter

const pull = require("pull-stream")

const debug = require("debug")

module.exports = function PeerStream(zite, zeronet) {

  const log = debug("zeronet:zite:peer-stream:zite:" + zite.address)

  log("creating")

  /*
  FAQ:
    - Why cache?
      - Because otherwise we either have slow response times or we add a cache
        Because this method would "short circuit" the streams and overload the dialer/tracker server,
        we needed to add a maximum amount
  */

  function PeerList() { //gets peers
    let height = 0
    return function (end, cb) {
      if (end) return cb(end)
      log("peer:list:out read")
      let list

      function getLoop() {
        list = zite.pool.getAll().slice(height) //get all unused
        if (list.length) {
          log("peer:list:out got", list.length)
          if (!list[5]) zite.discovery.discover(() => {}) //low peers
          height++
          return cb(null, list[0])
        } else {
          log("peer:list:out drained. discover")
          zite.discovery.discover(() => {
            zite.discovery.once("peer", () => {
              process.nextTick(getLoop)
            })
          })
        }
      }
      getLoop()
    }
  }

  function PeerGetter(a) { //gets peers and caches up to a
    let peers = []
    let ended = false
    let ee = new EE()
    let pause
    return {
      sink: function (read) {
        read(null, function next(end, peer) {
          if (end) return
          peers.push(peer)
          log("peer:getter:in cache peer", peers.length)
          ee.emit("got:peers", peer)
          if (ended) return read(ended)
          if (peers.length < a) return read(null, next)
          pause = true
          ee.once("get:peers", () => read(null, next))
        })
      },
      source: function (end, cb) {
        if (end) {
          ended = true
          return cb(end)
        }
        log("peer:getter:out send peer", peers.length)
        if (peers.length < a && pause) {
          pause = false
          ee.emit("get:peers")
        }
        if (peers.length) return cb(null, peers.shift())
        else ee.once("got:peers", () => cb(null, peers.shift()))
      }
    }
  }

  function DialerMachine(ee, id) {
    const self = this
    self.isFree = true
    self.id = id
    self.dial = peer => {
      self.isFree = false
      peer.dial(zeronet.swarm, err => {
        log("dialer:machine dialed", id, "success =", !err)
        if (!err) ee.emit("dial:ok", peer)
        self.isFree = true
        ee.emit("machine:free", self)
      })
    }
  }

  function PeerDialer(a, qa) { //dials peers and caches up to a
    let peers = []
    let ended = false
    let ee = new EE()
    let machines = []

    ee.on("dial:ok", peer => {
      peers.push(peer)
      log("dialer:machine dialed ok", peers.length)
      ee.emit("got:peers", peer)
    })

    ee.on("machine:free", () =>
      log("dialer:machine free %s/%s", machines.filter(m => m.isFree).length, machines.length))

    for (var i = 0; i < qa; i++)
      machines.push(new DialerMachine(ee, i))
    return {
      sink: function (read) {
        read(null, function next(end, peer) {
          if (end) return
          if (ended) return read(ended)

          function doDial() {
            const m = machines.filter(m => m.isFree)[0]
            if (m) {
              log("dial:machine", m.id)
              m.dial(peer)
              return read(null, next)
            } else ee.once("machine:free", doDial)
          }

          if (peers.length > a) ee.once("get:peers", doDial)
          else doDial()
        })
      },
      source: function (end, cb) {
        log("peer:dialer:out g", end)
        if (end) {
          ended = true
          return cb(end)
        }

        log("peer:dialer:out get called")

        function doSend() {
          log("peer:dialer:out send dialed peer", peers.length)
          cb(null, peers.shift())
        }

        if (peers.length == (a - 1)) ee.emit("get:peers")
        if (peers.length) return doSend()
        else ee.once("got:peers", doSend)
      }
    }
  }

  pull(
    PeerList(),
    PeerGetter(5),
    PeerDialer(3, 10)
  )
  return PeerDialer.source
}
