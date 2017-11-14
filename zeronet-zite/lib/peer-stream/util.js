"use strict"

const EE = require("events").EventEmitter

const pull = require("pull-stream")
const paramap = require("pull-paramap")
const Queue = require("data-queue")
const once = require("once")
const map = require("async/map")

module.exports.dialStream = w => pull(
  paramap((peer, cb) => peer.dial(err => cb(err ? false : peer)), w || 5, false),
  pull.filter(val => !!val)
)

module.exports.isOnlineFilter = () => pull.filter(peer => peer.isOnline)

module.exports.roundRobin = (timeout, ...sources) => {
  const src = [...sources].map(src => (end, cb) => {
    cb = once(cb)
    setTimeout(() => cb(new Error("Timeout")), timeout || 1000)
    return src(end, cb)
  }).reverse()

  if (!src.length) throw new Error("Empty round robin stream!")

  return (end, cb) => {
    if (end) return map(src, (s, cb) => s(end, () => cb()), cb)
    let tries = 0
    let s_
    const loop = (cb) => {
      const s = s_.pop()
      if (!s) return cb(new Error("Nothing found"))
      s(end, (err, data) => {
        if (err) return loop(cb)
        return cb(err, data)
      })
    }

    const outerLoop = () => {
      tries++
      if (tries === 3) return cb(new Error("Round robin failed"))
      s_ = src.slice(0)
      loop((err, data) => {
        if (err) return setTimeout(outerLoop, 1000)
        return cb(err, data)
      })
    }

    outerLoop()
  }
}

module.exports.getStream = (min) => {
  const q = Queue()
  const e = new EE()
  return {
    sink: read => read(null, function next(end, data) {
      if (end) return q.error(end)
      const err = q.append(data)
      const n = () => err ? read(err, null) : read(null, next)
      if (q.height() < min) n()
      else e.once("get", n)
    }),
    source: (end, cb) => {
      if (end) return q.error(end)
      e.emit("get")
      q.get(cb)
    }
  }
}
