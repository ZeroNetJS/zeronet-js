"use strict"

const merge = require("merge-recursive").recursive
const ZeroNet = require("zeronet-node")
const MEM = require("zeronet-storage-memory")

const Id = require("peer-id")

function consolePrefix(f, p) {
  return function () {
    const a = [...arguments]
    if (typeof a[0] == "string") a.unshift("[" + p + "] " + a.shift())
    else a.unshift("[" + p + "]")
    f.apply(console, a)
  }
}

function ZeroNetDefaultCommon(opt) {
  const self = this
  self.browser = true
  self.logger = name => {
    const l = consolePrefix(console.log, name)
    l.info = l
    l.log = l

    l.debug = opt.debug ? consolePrefix(console.info, "DEBUG/" + name) : () => {}
    l.trace = opt.debug ? consolePrefix(console.info, "TRACE/" + name) : () => {}

    l.warn = consolePrefix(console.warn, name)

    l.error = l.fatal = consolePrefix(console.error, name)

    return l
  }
  self.title = () => {}
}

module.exports = function ZeroNetBundler(opt) {

  const bname = opt.name || "ZeroNetBundle"
  let r = {}
  const strict = {
    modules: opt.modules
  }
  const defaults = merge(opt.override, {
    common: opt.common || ZeroNetDefaultCommon,
    swarm: {
      protocol: {
        crypto: [
          require("zeronet-crypto/secio")
        ]
      },
      libp2p: {
        transport: []
      }
    },
    modules: {},
    node: {
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
    storage: new MEM()
  })
  r[bname] = function (opt, cb) { //hack to set function name
    let config = merge(merge(defaults, strict), merge(opt, strict))
    if (!opt.common) config.common = new config.common({
      debug: opt.debug
    })
    let node
    const liftoff = (err, id) => {
      if (err) return cb(err)
      config.id = id
      node = new ZeroNet(config)
      cb(null, node)
    }

    if (!config.id) {
      Id.create({
        bits: 2048
      }, liftoff)
    } else liftoff()
  }
  return r[bname]

}
