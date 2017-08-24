'use strict'

const Connection = require('interface-connection').Connection
const debug = require('debug')
const log = debug('zeronet:dial')

const getId = require("zeronet-common/lib/peer").piFromAddr

function dialZN(swarm, ZProtocol) {

  const protocolLayer = ZProtocol.upgradeConn({
    isServer: false
  })

  return (pi, protocol, callback) => {
    if (typeof protocol === 'function') {
      callback = protocol
      protocol = null
    }

    callback = callback || function noop() {}

    const proxyConn = new Connection()

    getId(pi, (err, _pi) => {
      if (err) {
        return callback(err)
      }

      pi = _pi

      const b58Id = pi.id.toB58String()
      log('dialing %s', b58Id, pi.multiaddrs._multiaddrs.map(a => a.toString()).join(", "))

      if (!swarm.conns[b58Id]) {
        attemptDial(pi, (err, conn) => {
          if (err) {
            return callback(err)
          }
          conn.setPeerInfo(pi)
          protocolLayer(conn, (err, client) => {
            if (err) return callback(err)
            swarm.conns[b58Id] = client.conn
            return callback(null, client)
          })
        })
      } else {
        const conn = swarm.conns[b58Id]
        return callback(null, conn.client)
      }
    })

    return proxyConn

    function attemptDial(pi, cb) {
      const tKeys = Object.keys(swarm.transports)

      if (tKeys.length === 0) {
        return cb(new Error('No available transport to dial to'))
      }

      nextTransport(tKeys.shift())

      function nextTransport(key) {
        swarm.transport.dial(key, pi, (err, conn) => {
          if (err) {
            if (tKeys.length === 0) {
              return cb(new Error('Could not dial in any of the transports'))
            }
            return nextTransport(tKeys.shift())
          }
          return cb(null, conn)
        })
      }
    }
  }
}

/*

This might explain why it's so complicated.

- do znv2 handshake
  - If peer.libp2p
     - do libp2p/multistream handshake and muxer, crypto, etc
     - create a conn with /zn/2 as client
     - store conn with client and with libp2p flag
  - else
    - store conn
  - if proto is /zn/2
    - if !peer.libp2p
       - cb(null, client)
    - else
       - cb(null, conn.client)
  - else
      - if !peer.libp2p
         - fail with error "no libp2p support"
      - else
          - do hacky dial with proto

*/

const multistream = require('multistream-select')
const setImmediate = require('async/setImmediate')
const getPeerInfo = require('libp2p-swarm/src/get-peer-info')

const protocolMuxer = require('libp2p-swarm/src/protocol-muxer')

function dialL(swarm) {
  return (peer, protocol, callback) => {
    if (typeof protocol === 'function') {
      callback = protocol
      protocol = null
    }

    callback = callback || function noop() {}
    const pi = getPeerInfo(peer, swarm._peerBook)

    const proxyConn = new Connection()

    const b58Id = pi.id.toB58String()
    log('dialing %s', b58Id)

    if (!swarm.muxedConns[b58Id]) {
      if (!swarm.conns[b58Id]) {
        attemptDial(pi, (err, conn) => {
          if (err) {
            return callback(err)
          }
          gotWarmedUpConn(conn)
        })
      } else {
        const conn = swarm.conns[b58Id]
        swarm.conns[b58Id] = undefined
        gotWarmedUpConn(conn)
      }
    } else {
      if (!protocol) {
        return callback()
      }
      gotMuxer(swarm.muxedConns[b58Id].muxer)
    }

    return proxyConn

    function gotWarmedUpConn(conn) {
      conn.setPeerInfo(pi)
      attemptMuxerUpgrade(conn, (err, muxer) => {
        if (!protocol) {
          if (err) {
            swarm.conns[b58Id] = conn
          }
          return callback()
        }

        if (err) {
          // couldn't upgrade to Muxer, it is ok
          protocolHandshake(conn, protocol, callback)
        } else {
          gotMuxer(muxer)
        }
      })
    }

    function gotMuxer(muxer) {
      if (swarm.identify) {
        // TODO: Consider:
        // 1. overload getPeerInfo
        // 2. exec identify (through getPeerInfo)
        // 3. update the peerInfo that is already stored in the conn
      }

      openConnInMuxedConn(muxer, (conn) => {
        protocolHandshake(conn, protocol, callback)
      })
    }

    function attemptDial(pi, cb) {
      const tKeys = swarm.availableTransports(pi)

      if (tKeys.length === 0) {
        return cb(new Error('No available transport to dial to'))
      }

      nextTransport(tKeys.shift())

      function nextTransport(key) {
        swarm.transport.dial(key, pi, (err, conn) => {
          if (err) {
            if (tKeys.length === 0) {
              return cb(new Error('Could not dial in any of the transports'))
            }
            return nextTransport(tKeys.shift())
          }

          cryptoDial()

          function cryptoDial() {
            const ms = new multistream.Dialer()
            ms.handle(conn, (err) => {
              if (err) {
                return cb(err)
              }

              const id = swarm._peerInfo.id
              log('selecting crypto: %s', swarm.crypto.tag)
              ms.select(swarm.crypto.tag, (err, conn) => {
                if (err) {
                  return cb(err)
                }

                const wrapped = swarm.crypto.encrypt(id, id.privKey, conn)
                cb(null, wrapped)
              })
            })
          }
        })
      }
    }

    function attemptMuxerUpgrade(conn, cb) {
      const muxers = Object.keys(swarm.muxers)
      if (muxers.length === 0) {
        return cb(new Error('no muxers available'))
      }

      // 1. try to handshake in one of the muxers available
      // 2. if succeeds
      //  - add the muxedConn to the list of muxedConns
      //  - add incomming new streams to connHandler

      const ms = new multistream.Dialer()
      ms.handle(conn, (err) => {
        if (err) {
          return callback(new Error('multistream not supported'))
        }

        nextMuxer(muxers.shift())
      })

      function nextMuxer(key) {
        log('selecting %s', key)
        ms.select(key, (err, conn) => {
          if (err) {
            if (muxers.length === 0) {
              cb(new Error('could not upgrade to stream muxing'))
            } else {
              nextMuxer(muxers.shift())
            }
            return
          }

          const muxedConn = swarm.muxers[key].dialer(conn)
          swarm.muxedConns[b58Id] = {}
          swarm.muxedConns[b58Id].muxer = muxedConn
          // should not be needed anymore - swarm.muxedConns[b58Id].conn = conn

          muxedConn.once('close', () => {
            const b58Str = pi.id.toB58String()
            delete swarm.muxedConns[b58Str]
            pi.disconnect()
            swarm._peerBook.get(b58Str).disconnect()
            setImmediate(() => swarm.emit('peer-mux-closed', pi))
          })

          // For incoming streams, in case identify is on
          muxedConn.on('stream', (conn) => {
            protocolMuxer(swarm.protocols, conn)
          })

          setImmediate(() => swarm.emit('peer-mux-established', pi))

          cb(null, muxedConn)
        })
      }
    }

    function openConnInMuxedConn(muxer, cb) {
      cb(muxer.newStream())
    }

    function protocolHandshake(conn, protocol, cb) {
      const ms = new multistream.Dialer()
      ms.handle(conn, (err) => {
        if (err) {
          return cb(err)
        }
        ms.select(protocol, (err, conn) => {
          if (err) {
            return cb(err)
          }
          proxyConn.setInnerConn(conn)
          cb(null, proxyConn)
        })
      })
    }
  }
}

function dial(swarm, ZProtocol) { //fallback which allows both libp2p and znv2 and then applies the magic
  const zdial = dialZN(swarm, ZProtocol)
  const ndial = dialL(swarm)
  return (peer, protocol, callback) => {
    if (typeof protocol === 'function') {
      callback = protocol
      protocol = "/zn/2.0.0/"
    }

    callback = callback || function noop() {}
    //dial with znv2
    zdial(peer, (err, conn) => {
      if (protocol.startsWith("/zn")) {
        //if libp2p supported
        //use client from conn
        //if the conn has no client create one
      } else {
        //if !libp2p supported
        //fail
      }
    })
  }
}

module.exports = dial
module.exports.libp2p = dialL
