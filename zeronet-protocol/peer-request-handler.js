"use strict"

module.exports = function PeerRequestHandler(name, req, client) {
  const self = this

  function recv(data, handler) {
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
      client.write(resp)
    }, params, handler)
  }

  function send(data, cb) {
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
      client.write(req)
    }, data, cb)
  }

  self.send = send
  self.recv = recv
}
