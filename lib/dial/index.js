'use strict'

const Connection = require('interface-connection').Connection
const debug = require('debug')
const log = debug('zeronet:dial')

module.exports = function ZeroNetDial(swarm) {
  return (pi, protocol, callback) => {

    console.log("dlib")

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
        return callback(null, conn)
      })
    } else {
      const conn = swarm.conns[b58Id]
      swarm.conns[b58Id] = undefined
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
          cb(null, conn)
        })
      }
    }
  }
}
