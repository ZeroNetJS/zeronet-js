'use strict'

const Connection = require('interface-connection').Connection
const debug = require('debug')
const log = debug('zeronet:dial')
const crypto = require("crypto")

const sha5 = text => crypto.createHash('sha512').update(text).digest('hex')
const multiaddr = require("multiaddr")
const Id = require("peer-id")
const Peer = require('peer-info')

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const bs58 = require('base-x')(BASE58)

module.exports = function dial(swarm, ZProtocol) {
  function getId(pi, cb) {
    if (multiaddr.isMultiaddr(pi)) {
      const ad = pi.toString()
      const md = pi
      let pid = Id.createFromB58String("Q" + bs58.encode(sha5(ad).substr(0, 34)))
      Peer.create(pid, (err, pi) => {
        if (err) return cb(err)
        pi.multiaddrs.add(md)
        return cb(null, pi)
      })
    } else if (Peer.isPeerInfo(pi)) {
      return cb(null, pi)
    }
  }

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
      log('dialing %s', b58Id)

      if (!swarm.conns[b58Id]) {
        attemptDial(pi, (err, conn) => {
          if (err) {
            return callback(err)
          }
          conn.setPeerInfo(pi)
          protocolLayer(conn, err => {
            if (err) return callback(err)
            swarm.conns[b58Id] = conn
            return callback(null, conn)
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

    function protocolLayer(conn, cb) {
      ZProtocol.upgradeConn({
        isServer: false
      })(conn, cb)
    }
  }
}
