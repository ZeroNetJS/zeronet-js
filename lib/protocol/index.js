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
    console.log("sent", data)
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
    console.log("got", data)
    if (data.cmd == "response") {
      if (cbs[data.to]) {
        cbs[data.to](data)
        delete cbs[data.to]
      }
    } else if (data.cmd) {
      console.log("got %s", data.cmd, data)
      msg.emit("cmd", data)
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
    const fnc = function PeerRequest() { //client (we)
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

    msg.on("cmd", data => { //server (they)
      if (data.cmd != name) return

      function finish(err) { //finish off cb with data or error
        if (err) {
          console.error("Serverside error", err)
          write({
            cmd: "response",
            to: data.req_id,
            error: err.toString()
          })
        }
        const a = [].slice.call(arguments, 0) //turn "arguments" into array
        a.shift() //remove err arg

        const respData = {}
        let i = 0
        Object.keys(ret).forEach(key => {
          respData[key] = a[i]
          i++
        })

        respData.cmd = "response"
        respData.to = data.req_id
        write(respData)
      }

      try {
        const reqData = data.params
        validate(params, reqData)

        let cba = [data.cmd]
        Object.keys(params, key => {
          cba.push(reqData[key])
        })

        cba.push(finish)

        return msg.emit.apply(self, cba)
      } catch (e) {
        return finish(e)
      }
    })
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

  createProtocolFunction("handshake", { //FIXME: missing in the docs, just guessing
    target_ip: "string",
    version: "string",
    protocol: "string",
    crypt: () => !0,
    fileserver_port: "number",
    port_opened: "boolean",
    peer_id: "string",
    rev: "number",
    crypt_supported: Array.isArray
  })

  self.registerHandler = msg.on //(cmd,handler) => msg.on

  self.tlsUpgrade = function () {
    //close all streams and reopen/reint everything after adding a tls layer. and all that based on guesswork. fml.
  }

}
