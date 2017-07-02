"use strict"

module.exports = function PeerRequestHandler(name, req, client, handler) {
  const self = this

  function recv(data, handler, write) {
    const {
      req_id,
      params
    } = data
    req.handleRequest((err, res) => {
      let resp = {
        cmd: "response",
        to: req_id
      }
      if (err) {
        data.error = err instanceof Error ? err.toString().split("\n")[0] : err.toString()
      } else {
        for (var p in req.defOut)
          resp[p] = res[p]
      }
      write(resp)
    }, params, handler)
  }

  function send(data, cb, write) {
    let res = {}
    for (var p in req.defOut)
      res[p] = data[p]
    req.sendRequest((data, cb) => {
      const req = {
        cmd: name,
        params: data,
        req_id: client.req_id++
      }
      client.addCallback(req.id, data => {
        if (data.error) {
          let e = new Error(data.error)
          e.raw = data.error
          e.stack = "Error: " + data.error + "\n    at PeerRequest(" + name + ")" + "\n    at ZeroNet Protocol"
          return cb(e)
        } else {
          let res = {}
          for (var p in req.defIn)
            res[p] = data[p]
          return cb(null, res)
        }
      })
      write(req)
    }, res, cb)
  }

  self.send = (data, cb) => send(data, cb, client.write)
  self.recv = data => recv(handler, data, client.write)
}
