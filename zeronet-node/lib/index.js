"use strict"

const Swarm = require("zeronet-swarm")
const UiServer = require("zeronet-uiserver")

const debug = require("debug")
const log = debug("zeronet:node")
const series = require('async/series')
const clone = require("clone")
const uuid = require("uuid")

const PeerPool = require("zeronet-common/lib/peer/pool")
const TrackerManager = require("zeronet-common/lib/tracker/manager")
const ZiteManager = require("zeronet-zite/lib/manager")

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

  const self = this
  const storage = self.storage = new StorageWrapper(options.storage)
  const common = self.zeronet = options.common || false

  self.version = "0.5.6" //TODO: those are all fake. use real ones.
  self.rev = 2109

  if (common) {
    self.logger = common.logger
  } else {
    /**
      Creates a logger
      @param {string} prefix
      @return {Logger}
      */
    self.logger = prefix => {
      const d = debug("zeronet:" + prefix)
      d.info = d
      d.trace = d
      d.debug = d
      d.warn = debug("zeronet:" + prefix + ":warn")
      d.error = debug("zeronet:" + prefix + ":error")
      d.fatal = debug("zeronet:" + prefix + ":fatal")
      return d
    }
  }

  const swarm = self.swarm = new Swarm(options.swarm, self)
  const uiserver = self.uiserver = options.uiserver ? new UiServer(options.uiserver, self) : false

  const logger = self.logger("node")

  //-ZNXXXX- 8 chars + 12 chars random
  self.peer_id = "-ZN" + ("0" + self.version.replace(/\./g, "")) + "-" + uuid().replace(/-/g, "").substr(0, 12)

  logger("ZeroNet v[alpha] with peer_id %s", self.peer_id)

  if (!options.swarm.protocol || !options.swarm.protocol.crypto || !options.swarm.protocol.crypto.length) logger.warn("CRYPTO DISABLED! ALL COMMUNICATION IS IN PLAINTEXT!")

  const pool = self.peerPool = new PeerPool()
  /*const trackerManager = */
  self.trackers = new TrackerManager(options.node.trackers, self)

  const ziteManager = self.zitem = new ZiteManager(self)
  self.peerInfo = swarm.peerInfo

  self.zites = ziteManager.zites
  self.addZite = ziteManager.add

  let sintv

  /**
    Starts the node
    @param {callback} callback
    */
  self.start = cb => series([ //loads all the stuff from disk and starts everything
    storage.start,
    cb => swarm.start(cb),
    self.boot,
    cb => sintv = setInterval(self.save, 10 * 1000, cb()), //TODO: "make this great again"
    uiserver ? uiserver.start : cb => cb()
  ], cb)

  /**
    Loads the config from disk (already done by start)
    @param {callback} callback
    */
  self.boot = cb => series([
    cb => storage.getJSON("peers", [], (err, res) => {
      if (err) return cb(err)
      pool.fromJSON(res, cb)
    }),
    cb => storage.getJSON("zites", [], (err, res) => {
      if (err) return cb(err)
      ziteManager.fromJSON(res, cb)
    })
  ], cb)

  /**
    Saves the config to disk
    @param {callback} callback
    */
  self.save = cb => { //save to disk
    log("saving to disk")
    const s = new Date().getTime()
    series([
      cb => storage.setJSON("peers", pool.toJSON(), cb),
      cb => storage.setJSON("zites", ziteManager.toJSON(), cb)
    ], err => {
      log("saved in %sms", new Date().getTime() - s)
      if (err) log(err)
      if (cb) cb(err)
    })
  }

  /**
    Stops the node
    @param {callback} callback
    */
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
