"use strict"

const msgpack = require("msgpack")
const tls = require("tls")
const clone = require("clone")

const path = require("path")
const msgpackstream = require(path.join(__dirname, "/../msgpack-stream"))

module.exports = function Protocol(stream, config, zeronet) {
  //Turns a stream into a zeronet protocol client
  let msg = new msgpackstream(stream)
  const self = this
  let req_id = -1 //req_id
  let cbs = {}

  const log = config.log

  //const buffer_size = 1024 * 512 //aka 512kb

  function write(data) {
    log.trace(debugPrepare(data), "sent")
    stream.write(msgpack.pack(data))
  }

  function debugPrepare(data) {
    let r = {}
    if (data.params) {
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

  function validate(def, param) {
    //validate if "param" matches "def"
    for (var p in def) {
      switch (typeof def[p]) {
      case "function":
        if (!def[p](param[p])) throw new Error("Invalid value for key " + p + " (validation function)")
        break
      case "string":
        if (typeof param[p] != def[p]) throw new Error("Invalid value for key " + p + " (type missmatch expected=" + def[p] + ", got=" + param[p] + ")")
        break
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
          log.error("Serverside error", err)
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
        Object.keys(params).forEach(key => {
          cba.push(reqData[key])
        })

        cba.push(finish)

        return msg.emit.apply(msg, cba)
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

  createProtocolFunction("handshake", { //FIXME: missing in the docs, just guessing.
    //seems to be some crypto exchange command.
    crypt: a => !a,
    crypt_supported: Array.isArray,
    fileserver_port: "number",
    peer_id: "string",
    port_opened: "boolean",
    protocol: "string",
    rev: "number",
    target_ip: "string",
    version: "string",
  }, {
    //seems to be some crypto exchange command.
    crypt: "string",
    crypt_supported: Array.isArray,
    fileserver_port: "number",
    peer_id: "string",
    port_opened: "boolean",
    protocol: "string",
    rev: "number",
    target_ip: "string",
    version: "string",
  })

  //XXX: and the mess gets bigger. at least 3 undocumented network commands.

  let handlers = [] //save all assigned handlers so they can be re-added after tls upgrade

  self.details = {} //some details we can get via handshake

  self.registerHandler = (cmd, handler) => {
    handlers.push({
      cmd,
      handler
    })
    msg.on(cmd, handler)
  }

  let cryptSupported = ["tls-rsa"]

  /* live traffic

  {'cmd': 'handshake',
   'params': {'crypt': None,
              'crypt_supported': ['tls-rsa'],
              'fileserver_port': 15441,
              'peer_id': '-ZN0055-ohV0QYNHDyId',
              'port_opened': False,
              'protocol': 'v2',
              'rev': 2091,
              'target_ip': '217.234.60.22',
              'version': '0.5.5'},
   'req_id': 0}
  {'cmd': 'response',
   'crypt': 'tls-rsa',
   'crypt_supported': ['tls-rsa'],
   'fileserver_port': 15542,
   'peer_id': '-ZN0056-SS1oKxcjtyNW',
   'port_opened': None,
   'protocol': 'v2',
   'rev': 2109,
   'target_ip': '183.31.14.139',
   'to': 0,
   'version': '0.5.6'}

  */

  //bypass registering as this isn't required after tls
  msg.on("handshake", (crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version, cb) => {
    if (protocol != "v2") return cb("Protocol unsupported") //TODO use offical error message
    const first_match = crypt_supported.filter(c => cryptSupported.indexOf(c) != -1)[0] //the first crypto we AND the client support
    if (!first_match) return cb("No common crypto") //TODO: use offical error or etc
    self.details.version = version
    self.details.peer_id = peer_id
    self.details.rev = rev
    //TODO: don't use fake values
    //(crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version)
    self.tlsUpgrade({
      crypto: first_match,
      isServer: true
    }, err => {
      if (err) console.error("TLS ERROR", err.toString())
      cb(null, first_match, cryptSupported, zeronet.server.port, zeronet.peer_id, false, "v2", zeronet.rev, "localhost", zeronet.version)
    })
  })

  self.tlsUpgrade = function (options, cb, asy) {
    //FIXME: https://stackoverflow.com/questions/25769108/how-to-use-tlssocket-renegotiateoptions-callback-in-node-js-0-11-8-and-higher
    //could be a solution
    //also the cert isn't added which is also a problem
    /*if (!asy) {
      stream.cork()
      return process.nextTick(() => self.tlsUpgrade(options, cb, true))
    }*/
    log.debug({
      isServer: options.isServer
    }, "tls handshake init")

    //close all streams and reopen/reint everything after adding a tls layer. and all that based on guesswork.
    let nstream = new tls.TLSSocket(stream, {
      isServer: options.isServer,
      rejectUnauthorized: false
    }, console.log)
    msg = new msgpackstream(nstream)
    handlers.forEach(handler => {
      msg.on(handler.cmd, handler.handler)
    })
    msg.on("msg", handler)
    log("tls upgrade finished")
    stream.uncork()
    cb()
    stream = nstream
  }

  const ohandshake = self.handshake
  self.handshake = function (cb) {
    //(crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version)
    ohandshake(null, cryptSupported, zeronet.server ? zeronet.server.port : 15441, zeronet.peer_id, false, "v2", zeronet.rev, "localhost", zeronet.version,
      (crypt, crypt_supported, fileserver_port, peer_id, port_opened, protocol, rev, target_ip, version) => {
        self.details.version = version
        self.details.peer_id = peer_id
        self.details.rev = rev
        self.tlsUpgrade({
          crypto: crypt,
          isServer: false
        }, err => {
          if (err) log.error("TLS ERROR", err.toString())
          return cb()
        })
      })
  }

}
