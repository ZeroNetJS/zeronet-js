"use strict"

module.exports = function ZitePeerPool(zite, zeronet) { //peer pool for a specific zite
  const self = this
  const pool = zeronet.pool

  function getAll() {
    return pool.getZite(zite)
  }

  function getConnected() {
    return pool.getZite(zite).filter(peer => !!peer.client)
  }

  function getUnconnected() {
    return pool.getZite(zite).filter(peer => !peer.client)
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
    let ok = getConnected()
    let avail = getUnconnected()
    const next = (cb) => {
      let p
      if (ok.length) cb(null, ok.shift())
      else if (avail.length) p = avail.shift().dial(zeronet.swarm, err => {
        if (err) next(cb)
        else cb(p)
      })
      else next("DRAINED")
    }
    return next
  }

  self.getAll = getAll
  self.getUntil = getUntil
  self.getMany = getMany
  self.getConnected = getConnected
}
