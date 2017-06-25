'use strict'

const Connection = require('interface-connection').Connection
const debug = require('debug')
const log = debug('zeronet:dial')
const ZClient = require("zeronet-client")

module.exports = function dial(swarm, zeronet) {
  return (pi, protocol, callback) => {
    if (typeof protocol === 'function') {
      callback = protocol
      protocol = null
    }

    callback = callback || function noop() {}

    const proxyConn = new Connection()

    const b58Id = pi.id.toB58String()
    log('dialing %s', b58Id)

    if (!swarm.conns[b58Id]) {
      attemptDial(pi, (err, conn) => {
        if (err) {
          return callback(err)
        }
        conn.setPeerInfo(pi)
        conn.zinfo = {
          isServer: false
        }
        protocolLayer(conn, err => {
          if (err) return callback(err)
          swarm.conns[b58Id] = conn
          return callback(null, conn)
        })
      })
    } else {
      const conn = swarm.conns[b58Id]
      return callback(null, conn)
    }

    return proxyConn

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
          return cb(null, conn)
        })
      }
    }

    function protocolLayer(conn, cb) {
      ZClient.upgradeConn(conn, zeronet, cb)
    }
  }
}
