"use strict"

const pull = require("pull-stream")

//bridge

const Queue2 = require("data-queue")

//duplex bridge stream

module.exports = function DuplexBridge(dup) {
  const src_q = Queue2()
  const sink_q = Queue2()
  const q = {
    _pre: Queue2(),
    _post: Queue2(),
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

  /*let srun = true

  function sinkloop() {
    q["_" + u].get((e, r) => {
      if (e) return sink_q.error(e, srun = false)
      if (sink_q.append(r)) {
        q._pre.error(sink_q.append())
        q._post.error(sink_q.append())
        return (srun = false)
      }
      return sinkloop()
    })
  }
  sinkloop()*/

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
    /*pull.map(d => {
      console.log("writein", addr, d.length)
      console.log(d.toString())
      return d
    }),*/
    cat.sink
  )
  pull(
    cat.source,
    /*pull.map(d => {
      console.log("writeout", addr, d.length)
      console.log(d.toString())
      return d
    }),*/
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
        //if (q._pre.append(data)) return read(q._pre.append())
        if (sink_q.append(data)) return read(sink_q.append())
        read(null, next)
      })
    },
    restore: d => {
      //change the queue to append
      u = "post"

      if (Array.isArray(d)) //prepend data
        d.forEach(q.post.prepend)

      //move everything from pre queue to post queue
      q.pre.error(true)
      //q._pre.error(true)
      //q._post.error(true)

      function loop() {
        q.pre.get((e, r) => {
          if (e) return
          q.post.append(r)
          loop()
        })
      }
      loop() //it's in sync so it blocks

      //if (!srun) sinkloop()

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
        //if (q._post.append(data)) return read(q._post.append())
        if (sink_q.append(data)) return read(sink_q.append())
        read(null, next)
      })
    }
  }

  return pre_stream
}

module.exports.through = function ThroughBridge() {
  const out = Queue2()
  const self = function (read) {
    return function (end, cb) {
      if (end) out.error(end)
      return read(end, function (end, data) {
        if (!end) out.append(data)
        else out.error(end)
        cb(end, data)
      })
    }
  }
  self.source = function (end, cb) {
    if (end) {
      out.error(end)
      return cb(end)
    }
    out.get(cb)
  }

  return self
}
