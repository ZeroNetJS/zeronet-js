"use strict"

const Swarm = require("zeronet-swarm")

const debug = require("debug")
const log = debug("zeronet:node")
const series = require('async/series')
const uuid = require("uuid")

const PeerPool = require("zeronet-common/lib/peer/pool")
const TrackerManager = require("zeronet-common/lib/tracker/manager")
const ZiteManager = require("zeronet-zite/lib/manager")

const StorageWrapper = require("zeronet-common/lib/storage/wrapper") //wraps a storage into a more usable api
const assert = require("assert")

/**
 * ZeroNet full-node
 * @param {object} options
 * @namespace ZeroNetNode
 * @constructor
 */
function ZeroNetNode(options) {

  if (!options) options = {}
  if (!options.modules) options.modules = {}
  if (!options.node) options.node = {
    trackers: []
  }
  if (!options.swarm) options.swarm = {}

  options.swarm.id = options.id

  assert(options.storage, "no zeronet storage given")
  assert(options.id, "no id given")

  log("creating a new node", process.env.INTENSE_DEBUG ? options : {
    id: options.id.toB58String(),
    storage: options.storage.constructor.name,
    common: options.common,
    protocol: options.swarm.protocol,
    swarm: {
      server: options.swarm.server,
      server6: options.swarm.server6,
    },
    uiserver: options.uiserver,
    node: options.node
  })

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

  const UiServer = options.modules.uiserver
  const NAT = options.modules.nat

  const swarm = self.swarm = new Swarm(options.swarm, self)
  const uiserver = self.uiserver = options.uiserver ? new UiServer(options.uiserver, self) : false
  const nat = self.nat = options.nat ? new NAT(swarm, options.swarm) : false

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
    self.boot,
    cb => swarm.start(cb),
    ziteManager.start,
    cb => sintv = setInterval(self.save, 10 * 1000, cb()), //TODO: "make this great again"
    uiserver ? uiserver.start : cb => cb(),
    options.nat ? nat.doDefault : cb => cb()
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
      ziteManager.stop,
      self.save,
      cb => sintv = clearInterval(sintv, cb()), //TODO: "make this great again"
      cb => swarm.stop(cb),
      storage.stop
    ], cb)
  }
}

module.exports = ZeroNetNode
