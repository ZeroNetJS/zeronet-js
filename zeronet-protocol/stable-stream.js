"use strict"

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const Readable = require("stream").Readable

const debug = require("debug")
const log = debug("zeronet:stable")

const uuid = require("uuid")

function StablePullStream(head, tail, destroy) {
  const self = this
  self.head = head
  self.source = head
  self.tail = tail
  self.sink = tail
  let destroyed = false
  self.destroy = () => {
    if (destroyed) throw new Error("Already destroyed.")
    destroyed = true
    destroy()
  }
}

module.exports = function StableStream(conn) {

  log("Initializing")

  function reader(id) {
    return function (end, cb) {
      if (end) return cb(end)
      if (curid != id) return //return cb(new Error("Stream has been destroyed."), null)
      //read from queue
      log("read", id, que)
      if (que.length) {
        const d = que.shift()
        log("read_que", id, d)
        return cb(null, d)
      }
      r.once("data", data => log("read_got", id, data) || cb(null, data)) //otherwise wait for fresh data
    }
  }

  function writer(id) {
    return function (read) {
      read(null, function next(end, data) {
        if (end === true) return
        if (end) throw end
        if (curid != id) return //throw new Error("Stream has been destroyed.")

        log("write", id, data)
        p.push(data)
        read(null, next)
      })
    }
  }

  const self = this

  const p = Pushable()
  const r = Readable()
  r._read = () => {}

  let cur
  let curid
  let cork = true
  let que = []

  r.on("data", function ca(data) {
    log("input", cork || curid, data)
    if (cork) que.push(data)
  })

  pull(
    p,
    conn,
    pull.map((data) => {
      r.push(data)
      return null
    }),
    pull.drain(() => {})
  )

  self.create = () => {
    if (cur) throw new Error("Already streaming. Destroy before creating.")
    curid = uuid()
    log("create", curid)
    return (cur = new StablePullStream(reader(curid), writer(curid), () => {
      curid = null
      cork = true
      cur = null
    }))
  }

}
