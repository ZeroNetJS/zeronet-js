"use strict"

const debug = require("debug")
const log = debug("zeronet:zite:peer-pool")

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
    return pool.getZite(zite)
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
    const next = (cb, r) => {
      let p
      if (!ok) ok = all.filter(peer => !!peer.client)
      if (!avail) avail = all.filter(peer => !peer.client)
      if (ok.length) cb(null, ok.shift())
      else if (avail.length) p = avail.shift().dial(zeronet.swarm, err => {
        if (err) next(cb)
        else cb(p)
      })
      else {
        log("seems drained. using discovery.")
        zite.discovery.discover(err => {
          if (err) cb(log(err))
          setTimeout(() => {
            all = getAll().slice(aheight)
            log("discovered", all.length)
            if (!all.length && r) return cb(log("DRAINED"))
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
