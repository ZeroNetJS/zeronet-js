"use strict"

const forge = require("node-forge")

const pull = require("pull-stream")
const Connection = require("interface-connection").Connection
const EE = require("events").EventEmitter

const gen = require("zeronet-crypto/gen")

const debug = require("debug")
const log = debug("zeronet:crypto:tls")

function Queue2() {
  const ee = new EE()
  let q = []
  let ed

  function unleak() {
    ee.removeAllListeners("err")
    ee.removeAllListeners("data")
  }

  return {
    append: data => {
      if (ed) return ed
      q.push(data)
      ee.emit("data")
    },
    prepend: data => { //better only call this before the get queue starts
      if (ed) return ed
      q.unshift(data)
    },
    error: e => {
      ed = e
      ee.emit("err", e)
    },
    get: cb => {
      unleak()
      if (ed) return cb(ed)
      if (q.length) return cb(null, q.shift())
      ee.once("err", e => {
        unleak()
        cb(e)
      })
      ee.once("data", () => {
        unleak()
        return cb(null, q.shift())
      })
    }
  }
}

function Stream(src_q, sink_q) {
  return {
    source: function (end, cb) {
      if (end) {
        sink_q.error(end)
        return cb(end)
      }
      sink_q.get(cb)
    },
    sink: function (read) {
      read(null, function next(end, data) {
        if (end) {
          src_q.error(end)
          return
        }
        src_q.append(data)
        read(null, next)
      })
    }
  }
}

module.exports = function TLSSupport(protocol) {
  module.exports.tls_rsa(protocol)
}

module.exports.tls_rsa = (protocol) => {
  log("generating 2k rsa x509 cert. may take some time")
  const cert = gen.rsa()
  protocol.crypto.add("tls-rsa", (conn, opt, cb) => {
    log("init forge tls")

    const inq = Queue2() //data client sends us
    const outq = Queue2() //data tls tells us to sent
    const stream = Stream(inq, outq) //tls stream

    const dinq = Queue2() //put decrypted data here
    const doutq = Queue2() //data to encrypt
    const newconn = new Connection(Stream(doutq, dinq)) //reverse as we need to take care of the data we have to encrypt

    function gloop(q, dd) {
      q.get((err, d) => {
        if (err) return dd(err)
        dd(err, d)
        gloop(q, dd)
      })
    }

    if (opt.isServer) {
      const server = forge.tls.createConnection({
        server: true,
        caStore: [],
        sessionCache: {},
        // supported cipher suites in order of preference
        cipherSuites: [
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA,
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA
        ],
        verifyClient: false,
        verify: () => true,
        connected: function (connection) {
          gloop(doutq, (err, data) => {
            if (err instanceof Error) throw err
            if (err) return connection.close()
            connection.prepare(data.toString("binary"))
          })
          cb(null, newconn)
          /* NOTE: experimental, start heartbeat retransmission timer
          myHeartbeatTimer = setInterval(function() {
            connection.prepareHeartbeatRequest(forge.util.createBuffer('1234'));
          }, 5*60*1000);*/
        },
        getCertificate: () => cert.cert,
        getPrivateKey: () => cert.privkey,
        tlsDataReady: function (connection) {
          // TLS data (encrypted) is ready to be sent to the client
          outq.append(new Buffer(connection.tlsData.getBytes()))
          // if you were communicating with the client above you'd do:
          // client.process(connection.tlsData.getBytes());
        },
        dataReady: function (connection) {
          dinq.append(new Buffer(connection.data.getBytes(),"binary"))
        },
        /* NOTE: experimental
        heartbeatReceived: function(connection, payload) {
          // restart retransmission timer, look at payload
          clearInterval(myHeartbeatTimer);
          myHeartbeatTimer = setInterval(function() {
            connection.prepareHeartbeatRequest(forge.util.createBuffer('1234'));
          }, 5*60*1000);
          payload.getBytes();
        },*/
        closed: function () {
          inq.error(true)
          dinq.error(true)
        },
        error: function (connection, error) {
          console.log('uh oh', error);
        }
      })
      gloop(inq, (err, data) => {
        if (err instanceof Error) throw err
        if (err) return
        server.process(data)
      })
    } else {
      const client = forge.tls.createConnection({
        server: false,
        caStore: [],
        sessionCache: {},
        // supported cipher suites in order of preference
        cipherSuites: [
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA,
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA
        ],
        virtualHost: 'example.com',
        verifyClient: false,
        verifyServer: false,
        verify: () => true,
        connected: function (connection) {
          gloop(doutq, (err, data) => {
            if (err instanceof Error) throw err
            if (err) return connection.close()
            connection.prepare(data.toString("binary"))
          })
          cb(null, newconn)
          /* NOTE: experimental, start heartbeat retransmission timer
          myHeartbeatTimer = setInterval(function() {
            connection.prepareHeartbeatRequest(forge.util.createBuffer('1234'));
          }, 5*60*1000);*/
        },
        tlsDataReady: function (connection) {
          // TLS data (encrypted) is ready to be sent to the client
          outq.append(new Buffer(connection.tlsData.getBytes()))
          // if you were communicating with the client above you'd do:
          // client.process(connection.tlsData.getBytes());
        },
        dataReady: function (connection) {
          dinq.append(new Buffer(connection.data.getBytes(),"binary"))
        },
        /* NOTE: experimental
        heartbeatReceived: function(connection, payload) {
          // restart retransmission timer, look at payload
          clearInterval(myHeartbeatTimer);
          myHeartbeatTimer = setInterval(function() {
            connection.prepareHeartbeatRequest(forge.util.createBuffer('1234'));
          }, 5*60*1000);
          payload.getBytes();
        },*/
        closed: function (connection) {
          inq.error(true)
          dinq.error(true)
        },
        error: function (connection, error) {
          console.log('uh oh', error);
        }
      })
      gloop(inq, (err, data) => {
        if (err instanceof Error) throw err
        if (err) return
        client.process(data)
      })
      client.handshake()
    }

    pull(
      conn,
      stream,
      conn
    )
  })
}
