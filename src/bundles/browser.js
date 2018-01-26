'use strict'

const Bundler = require('./bundle')
const WS = require('libp2p-websockets')
const Peers = require('../peers')
const Swarm = require('zeronet-swarm')
const Relay = require('zeronet-relay')
module.exports = Bundler({
  name: 'ZeroNetBrowserBundle',
  modules: {},
  override: {
    swarmModules: Swarm.modules.all().concat(new Relay()), // enable relay and upgrading
    swarm: {
      relay: Peers.relay,
      zero: {
        listen: [],
        transports: [],
        trackers: Peers.trackers.filter(tracker => tracker.startsWith('zero://')) // only use trackers with zero protocol via relay
      },
      libp2p: {
        listen: [],
        wstar: [],
        wstar_ignore: true,
        // wstar: Peers.wstar, TODO: re-enable when new ws-star comes out
        transports: [
          new WS()
        ]
      }
    }
  }
})
