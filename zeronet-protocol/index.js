"use strict"

const msgpack = require("msgpack")
const clone = require("clone")

const crypto = require("zeronet-crypto/protocol")
const tls = require("zeronet-crypto/tls")
const handshake = require(__dirname + "/handshake")

const msgpackstream = require(__dirname + "/msgpack-stream")
const validate = require("zeronet-common/verify").verifyProtocol

module.exports = function Protocol(stream, config, zeronet) {
  //Turns a stream into a zeronet protocol client
  let msg = new msgpackstream(stream)
  const self = this
  let req_id = -1 //req_id
  let cbs = {}

  self.logger = config.logger
  const log = self.logger("protocol")

  //const buffer_size = 1024 * 512 //aka 512kb
  function debugStream(stream) {
    if ((process.env.NODE_DEBUG || "").indexOf("zeronet-packets") != -1) {
      stream.on("data", data => console.log("raw--in server=%s tls=%s", config.isServer, !!stream._tlsOptions, data, data.toString()))
      const ow = stream.write.bind(stream)
      stream.write = function (data) {
        console.log("raw-out server=%s tls=%s", config.isServer, !!stream._tlsOptions, data, (data ? data : "<no-data>").toString())
        ow(data)
      }
    }
  }

  debugStream(stream)

  function write(data) {
    log.trace(debugPrepare(data), "sent")
    stream.write(msgpack.pack(data))
  }

  function debugPrepare(data) {
    let r = {}
    if (data.error) {
      return {
        error: data.error
      }
    } else if (data.params) {
      r = data
    } else {
      const d = clone(data)
      r.to = d.to
      r.cmd = "response"
      delete d.to
      delete d.cmd
      r.params = d
    }
    if (r.params.body) r.params.body = "<Buffer length=" + r.params.body.length + ">"
    return r
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

  const handler = data => {
    if (data.cmd == "response") {
      log.trace(debugPrepare(data), "got response %s", data.to)
      if (cbs[data.to]) {
        cbs[data.to](data)
        delete cbs[data.to]
      }
    } else if (data.cmd) {
      log.trace(debugPrepare(data), "got %s", data.cmd)
      msg.emit("cmd", data)
    }
  }

  msg.on("msg", handler)

  function createProtocolFunction(name, params, ret, opt) {
    //name=the command
    //params=the parameters with which to be called (object key => type/value/validation function)
    //return=the parameters that we get as a response (object key => type/value/validation function)
    //opt=additional options
    if (!opt) opt = {}
    const fnc = function PeerRequest(data, cb) { //client (we)
      let reqData
      if (opt.data) {
        reqData = data
      } else {
        const a = [].slice.call(arguments, 0) //turn "arguments" into array
        let i = 0
        reqData = {} //req data as object
        Object.keys(params).forEach(key => {
          reqData[key] = a[i]
          i++
        })
        cb = a[i]
      }

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
              if (!opt.data) cba.push(data[key])
            })
            if (opt.data) cba.push(respData)
            validate(ret, respData)
            return cb.apply(data, cba) //and call the callback
          }
        })
      } catch (e) {
        return cb(e)
      }
    }
    if (opt.clientHandle) {
      self["_" + name] = fnc
      self[name] = opt.clientHandle
    } else {
      self[name] = fnc
    }

    msg.on("cmd", data => { //server (they)
      if (data.cmd != name) return
      if (data.error) return log.error({
        error: data.error
      }, "Other side error", data.error)
      console.log(data)

      function finish(err, _data) { //finish off cb with data or error
        if (err) {
          log.error("Serverside error", err)
          write({
            cmd: "response",
            to: data.req_id,
            error: err.toString()
          })
        }
        const a = [].slice.call(arguments, 0) //turn "arguments" into array
        a.shift() //remove err arg

        let respData = {}
        if (opt.data) {
          Object.keys(ret).forEach(key => {
            respData[key] = _data[key]
          })
        } else {
          let i = 0
          Object.keys(ret).forEach(key => {
            respData[key] = a[i]
            i++
          })
        }

        respData.cmd = "response"
        respData.to = data.req_id

        write(respData)
      }

      try {
        const reqData = data.params
        validate(params, reqData)

        let cba = [data.cmd]
        if (!opt.data) {
          Object.keys(params).forEach(key => {
            cba.push(reqData[key])
          })
          cba.push(finish)
        } else {
          cba.push(reqData)
          cba.push(finish)
        }
        return msg.emit.apply(msg, cba)
      } catch (e) {
        return finish(e)
      }
    })

    if (opt.serverHandle) self.registerHandler(name, opt.serverHandle)
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

  //TODO: add all network commands and maybe seperate them in different files

  self.handle = createProtocolFunction
  self.debugStream = debugStream

  let handlers = self.handlers = [] //save all assigned handlers so they can be re-added after tls upgrade

  self.details = {} //some details we can get via handshake

  self.registerHandler = (cmd, handler) => {
    handlers.push({
      cmd,
      handler
    })
    msg.on(cmd, handler)
  }

  self.log = log
  self.zeronet = zeronet

  self.getStream = () => stream
  self.getMSG = () => msg

  self.postWrap = (_stream, _msg) => { //update stream and msg stream after wrapping
    stream = _stream
    msg = _msg
    msg.on("msg", handler)
  }

  /* Crypto Layer */
  crypto(self)

  /* Handshake */
  handshake(self)

  /* TLS mod */
  tls(self)

}
