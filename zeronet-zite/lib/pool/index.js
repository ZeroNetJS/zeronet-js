"use strict"

const debug = require("debug")
const log = debug("zeronet:zite:peer-pool")

const EE = require("events").EventEmitter

function MassDialer(zeronet) {
  const self = new EE()
  self.dial = peer => {
    peer.dial(zeronet.swarm, err => {
      if (!err) self.emit("peer", peer)
      else log(err)
    })
  }
  self.dialGroup = peers => {
    var found = 0
    let stfu

    function dialOne() {
      let p = peers.shift()
      if (stfu) return
      if (!p) return log("mass dial found", found, stfu = true)
      setTimeout(dialOne, 500)
      p.dial(zeronet.swarm, err => {
        if (err) {
          dialOne()
        } else {
          self.emit("peer", p)
          found++
          log("found until now",found)
          if (found > 10) peers = []
        }
      })
    }
    dialOne()
  }
  return self
}

/**
 * ZeroNet Zite peer pool
 * @param {Zite} zite - The zite
 * @param {ZeroNet} zeronet - Global zeronet object
 * @namespace ZitePeerPool
 * @constructor
 */
module.exports = function ZitePeerPool(zite, zeronet) { //peer pool for a specific zite
  const self = this
  const pool = zeronet.peerPool

  function getAll() {
    return pool.getZite(zite.address)
  }

  function getConnected() {
    return pool.getZite(zite).filter(peer => !!peer.client)
  }

  function dialMany(num, each) {
    each(pool.getZite(zite).filter(peer => !!peer.client).slice(0, num), (p, cb) => p.dial(zeronet.swarm, err => {
      if (!err) each(p)
      return cb()
    }), () => {})
  }

  function getMany(num, each) {
    const ok = getConnected()
    ok.forEach(p => {
      if (num) {
        each(p)
        num--
      }
    })
    if (num)
      dialMany(num, each)
  }

  function getUntil() {
    let all = getAll()
    let aheight = all.length
    let ok, avail
    let dlog = [] //backlog of peers we dialed dialMany
    let msd = MassDialer(zeronet) //dialing 'till the isp get's mad
    msd.on("peer", p => dlog.push(p))
    msd.on("peer:used", p => dlog = dlog.filter(_p => p.addr != _p.addr))
    log("initializing", aheight)
    const next = (cb, r) => {
      if (!ok) ok = all.filter(peer => !!peer.client)
      if (!avail) avail = all.filter(peer => !peer.client)
      if (ok.length) cb(ok.shift())
      else if (dlog.length) cb(dlog.shift())
      else if (avail.length) {
        /*let d = avail.slice(0, 10)
        avail = avail.slice(10)
        d.forEach(msd.dial)*/
        msd.dialGroup(avail) //unleash the madness
        avail = []
        msd.once("peer", p => {
          msd.emit("peer:used", p)
          cb(p)
        })
      } else {
        log("seems drained. using discovery.")
        zite.discovery.discover(err => {
          if (err) cb(log(err))
          setTimeout(() => {
            all = getAll().slice(aheight)
            log("discovered", all.length)
            if (!all.length && r) return log("DRAINED") //give up.
            ok = null
            avail = null
            next(cb, true)
          }, 1000)
        })
      }
    }
    return next
  }

  self.getAll = getAll
  self.getUntil = getUntil
  self.getMany = getMany
  self.getConnected = getConnected
  self.dialMany = dialMany
}
