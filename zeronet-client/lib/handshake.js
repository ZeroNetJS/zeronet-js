"use strict"

const msgstream = require("zeronet-client/lib/stream/msgpack")
const handshake = require("zeronet-protocol/lib/proto/handshake")
const util = require("util")
const Bridge = require("zeronet-client/lib/stream/bridge")
const bl = require("bl")
const clientDuplex = require("zeronet-client/lib/duplex")
const EE = require("events").EventEmitter

const pull = require('pull-stream')

const debug = require("debug")

const log = debug("zeronet:protocol:client:handshake")


function HandshakeClient(conn, protocol, zeronet, opt) {
  const self = this

  /* Handling */

  const handlers = self.handlers = {
    handshake: handshake(self, protocol, zeronet, opt)
  }
  let addrs
  conn.getObservedAddrs((e, a) => self.addrs = addrs = (opt.isServer ? "=> " : "<= ") + a.map(a => a.toString()).join(", "))
  log("initializing", addrs)

  function handleIn(data) {
    if (handlers[data.cmd]) handlers[data.cmd].recv(data)
    disconnect(d.end())
  }

  /* Callbacks */

  let cbs = {}

  function addCallback(id, cb) {
    cbs[id] = cb
  }

  function handleResponse(data) {
    if (cbs[data.to]) {
      cbs[data.to](data)
      delete cbs[data.to]
    }
  }

  self.req_id = 0

  self.addCallback = addCallback

  /* CMDS */

  const cmd = self.cmd = {}

  for (var name in handlers)
    cmd[name] = handlers[name].send.bind(handlers[name])

  function disconnect(e) {
    d.end()
    self.emit("end", e)
    self.write = () => {
      throw new Error("Offline")
    }
    self.cmd = {}
  }
  self.disconnect = disconnect

  /* logic */

  const s = Bridge(conn, addrs)

  let d = clientDuplex(addrs, handleIn, handleResponse, disconnect)
  self.write = d.write

  pull(
    s,
    d.u = msgstream.unpack(1),
    d,
    msgstream.pack(),
    s
  )

  /* getRaw */

  self.getRaw = cb => {
    d.u.getChunks().pipe(bl((err, data) => {
      log("appending %s leftover bytes", addrs, data.length)
      if (err) return cb(err)
      cb(null, s.restore([data]))
    }))
  }

  /* upgrade */

  self.upgrade = cb => {
    (opt.isServer ? self.waitForHandshake : self.handshake)((err, handshake, opt) => {
      if (err) return cb(err)
      const _conn = conn
      /*
      zeronet v2 over multistream-select over zeronet v2:
        the complete headache (that is zeronet and it's self-made protocol)
        that prevents webrtc support is being resolved by allowing direct libp2p communication over zeronet v2
        which then handles /zn/2.0.0 over multistream thus allowing us to have both libp2p and zeronet features over the same conn
        at it's being resolved here

        spoiler: it's super complex
      */
      self.getRaw((err, conn) => {
        if (err) return cb(err)
        conn.getObservedAddrs = _conn.getObservedAddrs
        conn.getPeerInfo = _conn.getObservedAddrs
        conn.handshake = handshake
        conn.handshakeOPT = opt
        if (handshake.hasLibp2p()) { //perform a libp2p upgrade
          conn.isLibp2p = true
          conn.isEmu = false
          //magic to be added
          //then call cb(null,client,libp2p_client)
        } else { //just pass the connection to the handler
          conn.isLibp2p = false
          conn.isEmu = true
          zeronet.swarm.swarm.protocols["/zn/2.0.0"].handlerFunc(conn, (err, client) => {
            if (err) return cb(err)
            return cb(null, client, false)
          })
        }
      })
    })
  }

}

util.inherits(HandshakeClient, EE)

module.exports = HandshakeClient
