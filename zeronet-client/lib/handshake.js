"use strict"

const msgstream = require("zeronet-client/lib/stream/msgpack")
const handshake = require("zeronet-protocol/lib/proto/handshake")
const util = require("util")
const Bridge = require("zeronet-client/lib/stream/bridge")
const bl = require("bl")
const clientDuplex = require("zeronet-client/lib/duplex")
const EE = require("events").EventEmitter
const libp2pProtocolMuxer = require("libp2p-swarm/src/protocol-muxer")
const getPi = require("zeronet-common/lib/peer").piFromAddr

const pull = require('pull-stream')

const debug = require("debug")

function upgradeConn(muxed_conn, conn) {
  muxed_conn.getObservedAddrs = conn.getObservedAddrs
  muxed_conn.getPeerInfo = conn.getPeerInfo
  muxed_conn.handshake = conn.handshake
  muxed_conn.handshakeOPT = conn.handshakeOPT
  muxed_conn.isLibp2p = conn.isLibp2p
  muxed_conn.isEmu = conn.isEmu
}

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
    const _opt = opt; //this one get's overwritten by crypto but for libp2p upgrades we need it
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
        conn.getPeerInfo = _conn.getPeerInfo
        conn.handshake = handshake
        conn.handshakeOPT = opt
        if (handshake.hasLibp2p()) { //perform a libp2p upgrade
          conn.isLibp2p = true
          conn.isEmu = false
          //FIXME: no disconnect
          if (_opt.isServer) {
            libp2pProtocolMuxer.bind(null, zeronet.swarm.swarm.protocols)(conn) //FIXME: this strips some values that need to be preserved
          } else {
            if (!conn.getObservedAddrs) return cb(new Error("conn.getObservedAddrs is missing"))
            conn.getObservedAddrs((err, addr) => {
              if (err) return cb(err)
              getPi(addr[0], (err, pi) => { //TODO: user peer-book
                if (err) return cb(err)
                zeronet.swarm.dial.upgradep2p(pi, conn, (err, muxed_conn) => {
                  if (err) return cb(err)
                  //console.log("upp", _opt)
                  upgradeConn(muxed_conn, conn)
                  zeronet.swarm.dial.dialp2p({
                    muxer: muxed_conn
                  }, "/zn/2.0.0", (err, conn) => {
                    if (err) return cb(err)
                    upgradeConn(conn, muxed_conn)
                    zeronet.swarm.swarm.protocols["/zn/2.0.0"].handlerFunc(conn, (err, client) => {
                      if (err) return cb(err)
                      client.muxer = muxed_conn
                      return cb(null, client, muxed_conn)
                    })
                  })
                })
              })
            })
          }
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
