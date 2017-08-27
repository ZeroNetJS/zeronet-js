"use strict"

const merge = require("merge-recursive").recursive
const ZeroNet = require("zeronet-node")
const MEM = require("zeronet-storage-memory")
const clone = require("clone")

const Id = require("peer-id")

module.exports = function ZeroNetBundler(opt) {

  const bname = opt.name || "ZeroNetBundle"
  let r = {}
  const strict = {
    modules: opt.modules
  }

  const defaults = merge(opt.override, {
    swarm: {
      zero: {
        listen: [],
        crypto: [
          require("zeronet-crypto/secio")
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
        ]
      },
      libp2p: {
        transport: []
      }
    },
    modules: {},
    storage: MEM
  })
  r[bname] = function (opt, cb) { //hack to set function name
    if (!cb) cb = () => {}
    if (!opt) opt = {}
    let config = merge(merge(clone(defaults), clone(strict)), merge(opt, clone(strict)))
    if (!opt.storage) config.storage = new defaults.storage()
    let node
    const liftoff = (err, id) => {
      if (err) return cb(err)
      if (id) config.id = id
      node = new ZeroNet(config)
      cb(null, node)
      return node
    }

    if (!opt.id) {
      Id.create({
        bits: 2048
      }, liftoff)
    } else return liftoff(null, opt.id)
  }
  return r[bname]

}
