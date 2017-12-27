'use strict'

const Bundler = require('./bundle')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const Peers = require('../peers')
module.exports = Bundler({
  name: 'ZeroNetNodeJSBundle',
  modules: {
    uiserver: require('zeronet-uiserver'),
    nat: require('zeronet-swarm/src/zero/nat')
  },
  override: {
    swarm: {
      zero: {
        listen: [],
        transports: [
          new TCP()
        ],
        trackers: Peers.trackers/*,
        nat: false */
      },
      libp2p: {
        listen: [],
        bootstrap: Peers.bootstrap_libp2p,
        wstar: Peers.wstar,
        transports: [
          new TCP(),
          new WS()
        ],
        mdns: true/*,
        dht: false */
      }
    }
  }
})
