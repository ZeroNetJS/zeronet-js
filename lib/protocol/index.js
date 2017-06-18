"use strict"

const msgpack = require("msgpack")

module.exports = function Protocol(stream) {
  //Turns a stream into a zeronet protocol client
  const msg = new msgpack.Stream(stream)
  const self = this
  let req_id = 0 //req_id
  let cbs = {}

  const buffer_size = 1024 * 512 //aka 512kb

  function write(data) {
    stream.write(msgpack.pack(data))
  }

  function request(cmd, params, cb) {
    req_id++
    cbs[req_id] = cb
    write({
      cmd,
      params,
      req_id
    })
  }

  msg.on("msg", data => {
    if (data.to) {
      if (cbs[data.to]) {
        cbs[data.to](data)
        delete cbs[data.to]
      }
    } else if (data.cmd) {
      console.log("got %s", data.cmd, data)
      msg.emit(data.cmd, data)
    }
  })

  function validate(def, param) {
    //validate if "param" matches "def"
    for (var p in def) {
      switch (typeof def[p]) {
      case "function":
        if (!def[p](param[p])) throw new Error("Invalid value for key " + p + " (validation function)")
        break;
      case "string":
        if (typeof param[p] != def[p]) throw new Error("Invalid value for key " + p + " (typeof)")
        break;
      }
    }
  }

  function createProtocolFunction(name, params, ret) {
    //name=the command
    //params=the parameters with which to be called (object key => type/value/validation function)
    //return=the parameters that we get as a response (object key => type/value/validation function)
    const fnc = function PeerRequest() {
      const a = [].slice.call(arguments, 0) //turn "arguments" into array
      let i = 0
      const reqData = {} //req data as object
      Object.keys(params).forEach(key => {
        reqData[key] = a[i]
        i++
      })

      const cb = a[i] //final callback
      if (typeof cb != "function") throw new Error("CB must be a function")

      try {
        validate(params, reqData)
        request(name, reqData, data => {
          if (data.error) {
            let e = new Error(data.error)
            e.raw = data.error
            e.stack = "Error: " + data.error + "\n    at PeerReqest(" + name + ")" + "\n    at ZeroNet Protocol"
            return cb(e)
          } else {
            const respData = {}
            const cba = [null] //array as argument for cb, first is err
            Object.keys(ret).forEach(key => {
              respData[key] = data[key]
              cba.push(data[key])
            })
            validate(ret, respData)
            return cb.apply(data, cba) //and call the callback
          }
        })
      } catch (e) {
        return cb(e)
      }
    }
    self[name] = fnc
  }

  //Peer requests (see: https://zeronet.readthedocs.io/en/latest/help_zeronet/network_protocol/)

  createProtocolFunction("getFile", {
    site: "string",
    inner_path: "string",
    location: "number"
  }, {
    body: Buffer,
    location: "number",
    size: "number"
  })

  createProtocolFunction("ping", {}, {
    body: b => b == "pong"
  })

  createProtocolFunction("pex", {
    site: "string",
    peers: "string",
    need: "number"
  }, {
    peers: "string"
  })

  createProtocolFunction("update", {
    site: "string",
    inner_path: "string",
    body: "object"
  }, {
    ok: "string"
  })

  //self.registerHandler=(handler) => msg.on("")

}
