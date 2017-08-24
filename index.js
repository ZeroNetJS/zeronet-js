const Bundler = require("./bundle")
const TCP = require('libp2p-tcp')
module.exports = Bundler({
  modules: {
    uiserver: require("zeronet-uiserver"),
    nat: require("zeronet-swarm/nat")
  },
  override: {
    swarm: {
      libp2p: {
        transport: [
          new TCP()
        ],
        mdns: true,
        dht: false
      }
    }
  }
})
