"use strict"

const Bundler = require("./bundle")
const TCP = require('libp2p-tcp')
module.exports = Bundler({
  name: "ZeroNetNodeJSBundle",
  modules: {
    uiserver: require("zeronet-uiserver"),
    nat: require("zeronet-swarm/lib/zero/nat")
  },
  override: {
    swarm: {
      zero: {
        listen: [],
        transports: [
          new TCP()
        ]/*,
        nat: false*/
      },
      libp2p: {
        listen: [],
        transports: [
          new TCP()
        ]/*,
        mdns: false,
        dht: false*/
      }
    }
  }
})
