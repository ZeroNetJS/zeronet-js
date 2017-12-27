'use strict'

const Bundler = require('./bundle')
const WS = require('libp2p-websockets')
const Peers = require('../peers')
module.exports = Bundler({
  name: 'ZeroNetBrowserBundle',
  modules: {},
  override: {
    swarm: {
      relay: Peers.relay,
      zero: {
        listen: [],
        transports: [],
        trackers: Peers.trackers.filter(tracker => tracker.startsWith('zero://')) // only use trackers with zero protocol via relay
      },
      libp2p: {
        listen: [],
        wstar: Peers.wstar,
        transports: [
          new WS()
        ]
      }
    }
  }
})
