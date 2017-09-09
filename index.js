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
        ],
        trackers: [
          //"zero://boot3rdez4rzn36x.onion:15441",
          //"zero://boot.zeronet.io#f36ca555bee6ba216b14d10f38c16f7769ff064e0e37d887603548cc2e64191d:15441",
          "udp://tracker.coppersurfer.tk:6969",
          "udp://tracker.leechers-paradise.org:6969",
          "udp://9.rarbg.com:2710",
          "http://tracker.opentrackr.org:1337/announce",
          "http://explodie.org:6969/announce",
          "http://tracker1.wasabii.com.tw:6969/announce"
          //"http://localhost:25534/announce"
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
