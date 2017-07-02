"use strict"

module.exports = function PeerRequestHandler(name, _req, client, handler) {
  const self = this

  function recv(data, handler, write) {
    const {
      req_id,
      params
    } = data
    _req.handleRequest((err, res) => {
      let resp = {
        cmd: "response",
        to: req_id
      }
      if (err) {
        data.error = err instanceof Error ? err.toString().split("\n")[0] : err.toString()
      } else {
        for (var p in _req.defOut)
          resp[p] = res[p]
      }
      write(resp)
    }, params, handler)
  }

  function send(data, cb, write) {
    let res = {}
    for (var p in _req.defOut)
      res[p] = data[p]
    _req.sendRequest((data, cb) => {
      const req = {
        cmd: name,
        params: data,
        req_id: client.req_id++
      }
      client.addCallback(req.req_id, data => {
        if (data.error) {
          let e = new Error(data.error)
          e.raw = data.error
          e.stack = "Error: " + data.error + "\n    at PeerRequest(" + name + ")" + "\n    at ZeroNet Protocol"
          return cb(e)
        } else {
          let res = {}
          for (var p in _req.defIn)
            res[p] = data[p]
          return cb(null, res)
        }
      })
      write(req)
    }, res, cb)
  }

  self.send = (data, cb) => send(data, cb, client.write)
  self.recv = data => recv(data, handler, client.write)
}
