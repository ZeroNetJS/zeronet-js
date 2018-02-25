#!/usr/bin/env node

'use strict'

require('colors')

let node
let dwait = require('./misc/hacky-logs.js')

const Peers = require('./peers')

const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

const MergeRecursive = require('merge-recursive').recursive
const ZeroNet = require('zeronet-node')

const FS = require('zeronet-storage-fs')

const Common = require('./misc/common')
const Swarm = require('zeronet-swarm')

let dir = require('./misc/storage-dir')()

mkdirp.sync(dir)
mkdirp.sync(path.join(dir, 'logs'))

let cm

const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')

const defaults = {
  id_expire: 1000 * 60 * 60 * 24 * 7, // approx 1 week
  modules: {
    uiserver: require('zeronet-uiserver'),
    nat: require('zeronet-swarm/src/zero/nat')
  },
  swarmModules: Swarm.modules.all(),
  swarm: {
    zero: {
      listen: [
        '/ip4/0.0.0.0/tcp/15543'
      ],
      transports: [
        new TCP()
      ],
      trackers: Peers.trackers,
      crypto: [
        require('zeronet-crypto').transport.secio,
        require('zeronet-crypto').transport.tls
      ],
      nat: true
    },
    libp2p: {
      listen: [
        '/ip4/0.0.0.0/tcp/15542',
        '/ip6/::/tcp/15542',
        '/p2p-websocket-star',
        '/ip4/0.0.0.0/tcp/15540/ws',
        '/ip6/::/tcp/15540/ws'
      ],
      transports: [
        new TCP(),
        new WS()
      ],
      bootstrap: Peers.bootstrap_libp2p,
      mdns: true,
      dht: false,
      wstar: Peers.wstar,
      wstar_ignore: true
    }
  },
  uiserver: {
    listen: {
      host: '127.0.0.1',
      port: 15544
    }
  },
  common: cm = new Common({
    debug_file: path.resolve(dir, path.join('logs', 'debug.log')),
    debug_shift_file: path.resolve(dir, path.join('logs', 'debug-last.log')),
    debug: Boolean(process.env.DEBUG)
  }),
  storage: new FS(path.join(dir, 'data'))
}

cm.logger('node')('Starting...')
cm.title('ZeroNetJS - Starting...')

const errCB = err => {
  if (!err && process.env.TESTOK) process.emit('SIGINT')
  if (!err) {
    cm.title('ZeroNetJS')
    return node.logger('node')('Started successfully')
  }
  cm.logger('node').fatal('The node failed to start')
  cm.logger('node').fatal(err)
  process.exit(2)
}

process.on('uncaughtException', err => {
  console.error(err.stack)
  cm.logger('node').fatal('FATAL ERROR')
  cm.logger('node').fatal(err)
  process.nextTick(() => process.exit(2))
})

const confpath = path.resolve(dir, process.env.CONFIG_FILE || 'config.json')
const idpath = path.resolve(dir, process.env.ID_FILE || 'id.json')

const readJSON = path => JSON.parse(fs.readFileSync(path).toString())
const writeJSON = (path, data) => fs.writeFileSync(path, Buffer.from(JSON.stringify(data)))

let config

if (fs.existsSync(confpath)) {
  const configData = readJSON(confpath)
  config = MergeRecursive(defaults, configData)
} else config = defaults

let exiting

function exit (code) {
  /**
    @namespace exit
    @constructor
    @private
    */
  if (!node) {
    cm.logger('node').error('Stopping before started!')
    exiting = true;
    ['error', 'warn'].forEach(k => (console.error[k] = console.error))
    node = {
      logger: () => console.error
    }
    exit(2)
  }
  if (exiting) {
    node.logger('node').warn('Force stop!')
    return process.nextTick(() => process.exit(2))
  }
  exiting = true
  node.logger('node')('Stopping...')
  node.logger('node')('Press ^C to force stop')
  node.stop(err => {
    if (err) {
      cm.logger('node').error(err)
      cm.logger('node').error('FAILED TO QUIT GRACEFULLY')
      throw err
    }
    node.logger('node')('Stopped')
    process.exit(code || 0)
  })
}

if (!process.env.IGNORE_SIG)['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(sig => process.on(sig, exit))

const Id = require('peer-id')

const liftoff = (err, id) => {
  if (err) return errCB(err)
  config.id = id
  node = new ZeroNet(config)
  dwait.map(d => d())
  dwait = null
  node.start(errCB)
}

const createAndSaveID = r => {
  cm.logger('id')('%s ID... This may take a few seconds...', r ? 'Changing' : 'Creating')
  if (r) cm.logger('id')('(The ID is changed every %s seconds to improve anonymity)', config.id_expire)
  Id.create({
    bits: 2048
  }, (err, id) => {
    if (err) return errCB(err)
    cm.logger('id')('Created ID %s!', id.toB58String())
    try {
      writeJSON(idpath, {
        id,
        created_at: new Date().getTime()
      })
      liftoff(null, id)
    } catch (e) {
      liftoff(e)
    }
  })
}

try {
  if (fs.existsSync(idpath)) {
    const id = readJSON(idpath)
    if ((id.created_at || 0) + config.id_expire < new Date().getTime()) {
      createAndSaveID(true)
    } else {
      Id.createFromJSON(id.id, liftoff)
    }
  } else createAndSaveID()
} catch (e) {
  liftoff(e)
}
