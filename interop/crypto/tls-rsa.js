'use strict'

const crypto = require('zeronet-crypto').tls.tls_rsa
const ZeroNet = require('../..')
const EE = require('events').EventEmitter
const ee = new EE()

const multiaddr = require('multiaddr')

let node

before(cb => {
  node = ZeroNet({
    id: global.id,
    swarm: {
      zero: {
        listen: [
          '/ip4/0.0.0.0/tcp/25335'
        ],
        crypto
      }
    }
  })
  const o = node.swarm.zero.protocol.upgradeConn
  node.swarm.zero.protocol.upgradeConn = function (opts) {
    return function (conn, cb) {
      o(opts)(conn, (err, c) => {
        ee.emit('client', err, c)
        if (cb) cb(err, c)
      })
      ee.emit('conn', conn)
    }
  }
  node.start(cb)
})

it('should handshake with tls-rsa', (cb) => {
  node.swarm.dial(multiaddr('/ip4/127.0.0.1/tcp/13344'), (e, c) => {
    if (e) return cb(e)
    if (c.handshakeData.commonCrypto() != 'tls-rsa') return cb(new Error('Failing: Wrong crypto used ' + c.handshakeData.commonCrypto() + ' != tls-rsa'))
    c.cmd.ping({}, cb)
  })
}).timeout(20000)

it('should handshake with tls-rsa as server', (cb) => {
  ee.once('client', (e, c) => {
    if (e) return cb(e)
    if (c.handshakeData.commonCrypto() != 'tls-rsa') return cb(new Error('Failing: Wrong crypto used ' + c.handshakeData.commonCrypto() + ' != tls-rsa'))
    cb()
  })
  it.zero(['peerCmd', it.zhost, '25335', 'ping'])
}).timeout(10000)

after(function (cb) {
  this.timeout(5000)
  node.stop(cb)
})
