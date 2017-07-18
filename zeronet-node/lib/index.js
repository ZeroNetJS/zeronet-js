"use strict"

const Swarm = require("zeronet-swarm")
const UiServer = require("zeronet-uiserver")

const debug = require("debug")
const log = debug("zeronet:node")
const series = require('async/series')
const clone = require("clone")

const ZeroNet = require("zeronet-common") //shared class, used for coordination
const StorageWrapper = require("zeronet-common/lib/storage/wrapper") //wraps a storage into a more usable api
const assert = require("assert")

const defaults = ZeroNetNode.defaults = { //The defaults
  swarm: {
    server: {
      host: "0.0.0.0",
      port: 15543
    },
    server6: {
      host: "::",
      port: 15543
    },
    protocol: {
      crypto: []
    }
  },
  uiserver: {
    listen: {
      host: "127.0.0.1",
      port: 15544
    }
  },
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
    ],
    //debug_file: path.resolve(process.cwd(""), "debug.log"),
    //debug_shift_file: path.resolve(process.cwd(""), "debug-last.log")
  },
  //storage: new ZNStorage("path", "dbpath")
}

/**
 * ZeroNet full-node
 * @param {object} options
 * @namespace ZeroNetNode
 * @constructor
 */
function ZeroNetNode(options) {

  if (!options) options = {}

  options = Object.assign(clone(defaults), options)

  if (!Array.isArray(options.trackers))
    options.trackers = [options.trackers]

  options.swarm.id = options.id

  log("creating a new node", options)

  assert(options.storage, "no zeronet storage given")
  const storage = new StorageWrapper(options.storage)

  const self = this
  const zeronet = self.zeronet = new ZeroNet(options.node)
  const swarm = self.swarm = new Swarm(options.swarm, zeronet)
  const uiserver = self.uiserver = options.uiserver ? new UiServer(options.uiserver, zeronet) : false

  const logger = zeronet.logger("node")

  if (!options.swarm.protocol || !options.swarm.protocol.crypto || !options.swarm.protocol.crypto.length) logger.warn("CRYPTO DISABLED! ALL COMMUNICATION IS IN PLAINTEXT!")

  self.peerPool = zeronet.pool
  self.peerInfo = swarm.peerInfo

  let sintv

  self.start = cb => series([ //loads all the stuff from disk and starts everything
    storage.start,
    self.boot,
    cb => sintv = setInterval(self.save, 10 * 1000, cb()), //TODO: "make this great again"
    cb => swarm.start(cb),
    uiserver ? uiserver.start : cb => cb()
  ], cb)

  self.boot = cb => series([
    cb => storage.getJSON("peers", [], (err, res) => {
      if (err) return cb(err)
      zeronet.pool.fromJSON(res, cb)
    }),
    cb => storage.getJSON("zites", [], (err, res) => {
      if (err) return cb(err)
      zeronet.zitem.fromJSON(res, cb)
    })
  ], cb)

  self.save = cb => { //save to disk
    log("saving to disk")
    const s = new Date().getTime()
    series([
      cb => storage.setJSON("peers", zeronet.pool.toJSON(), cb),
      cb => storage.setJSON("zites", zeronet.zitem.toJSON(), cb)
    ], err => {
      log("saved in %sms", new Date().getTime() - s)
      if (err) log(err)
      if (cb) cb(err)
    })
  }

  self.stop = cb => {
    series([
      uiserver ? uiserver.stop : cb => cb(),
      self.save,
      cb => sintv = clearInterval(sintv, cb()), //TODO: "make this great again"
      cb => swarm.stop(cb),
      storage.stop
    ], cb)
  }
}

module.exports = ZeroNetNode
