"use strict"

const pull = require("pull-stream")
const EE = require("events").EventEmitter

//bridge

function Queue2() {
  const ee = new EE()
  let q = []
  let ed

  function unleak() {
    ee.removeAllListeners("err")
    ee.removeAllListeners("data")
  }

  return {
    append: data => {
      if (ed) return ed
      q.push(data)
      ee.emit("data")
    },
    error: e => {
      ed = e
      ee.emit("err", e)
    },
    get: cb => {
      unleak()
      if (ed) return cb(ed)
      if (q.length) return cb(null, q.shift())
      ee.once("err", e => {
        unleak()
        cb(e)
      })
      ee.once("data", () => {
        unleak()
        return cb(null, q.shift())
      })
    }
  }
}

//duplex bridge stream

module.exports = function DuplexBridge(dup) {
  const src_q = Queue2()
  const sink_q = Queue2()
  const q = {
    pre: Queue2(),
    post: Queue2()
  }

  let u = "pre"

  function gloop() {
    src_q.get((e, d) => {
      if (e) return q.pre.error(e) || q.post.error(e)
      q[u].append(d)
      gloop()
    })
  }
  gloop()

  const cat = {
    source: function (end, cb) {
      if (end) {
        sink_q.error(end)
        return cb(end)
      }
      sink_q.get(cb)
    },
    sink: function (read) {
      read(null, function next(end, data) {
        if (end) {
          src_q.error(end)
          return
        }
        src_q.append(data)
        read(null, next)
      })
    }
  }

  pull(
    dup.source,
    cat.sink
  )
  pull(
    cat.source,
    dup.sink
  )

  const pre_stream = {
    source: function (end, cb) { //this outputs the data we recieve from "dup"
      if (end) { //pre sink has ended
        return cb(end)
      }
      q.pre.get(cb)
    },
    sink: function (read) {
      read(null, function next(end, data) { //this queues data to be sent over "dup"
        if (end) { //pre src has ended
          return
        }
        if (sink_q.append(data)) return read(sink_q.append())
        read(null, next)
      })
    },
    restore: () => {
      u = "post"
      return post_stream
    }
  }

  const post_stream = {
    source: function (end, cb) { //this outputs the data we recive from "dup"
      if (end) { //pre sink has ended
        return cb(end)
      }
      q.post.get(cb)
    },
    sink: function (read) {
      read(null, function next(end, data) { //this queues data to be sent over "dup"
        if (end) { //pre src has ended
          return
        }
        if (sink_q.append(data)) return read(sink_q.append())
        read(null, next)
      })
    }
  }

  return pre_stream
}
