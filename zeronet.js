#!/usr/bin/env node

"use strict"

let node
let dwait = require("./lib/hacky-logs.js")

const fs = require("fs")
const path = require("path")
const os = require("os")
const mkdirp = require("mkdirp")

const MergeRecursive = require("merge-recursive")
const ZeroNet = require("zeronet-node")

const FS = require("zeronet-storage-fs")

const Common = require("zeronet-common")

function getStorageDir() {
  if (process.env.RUNINCWD) return path.join(process.cwd(), ".zeronet")
  let isroot
  switch (true) {
  case !!process.platform.match(/^linux/):
    isroot = !process.getuid()
    switch (true) {
    case !!process.env.SNAP: //snap aka ubuntu core
      if (isroot)
        return process.env.SNAP_COMMON
      else
        return process.env.SNAP_USER_COMMON
      break;
    default:
      if (isroot)
        return "/var/lib/zeronet"
      else
        return path.join(os.homedir(), ".zeronet")
    }
    break;
  case !!process.platform.match(/^win/): //windows
    return path.join(process.env.APPDATA, "ZeroNet")
    break;
  case !!process.platform.match(/^darwin/): //mac
    return path.join(os.homedir(), "Library", "Preferences", "ZeroNet")
    break;
  default:
    throw new Error("Unsupported platform " + process.platform + "! Please report this!")
  }
}

let dir = getStorageDir()

mkdirp.sync(dir)
mkdirp.sync(path.join(dir, "logs"))

const defaults = {
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
  common: new Common({
    debug_file: path.resolve(dir, path.join("logs", "debug.log")),
    debug_shift_file: path.resolve(dir, path.join("logs", "debug-last.log")),
    debug: !!process.env.DEBUG
  }),
  storage: new FS(path.join(dir, "data"))
}

const errCB = err => {
  if (!err && process.env.TESTOK) process.emit("SIGINT")
  if (!err) return node.logger("node")("Started successfully")
  console.error("The node failed to start")
  console.error(err)
  process.exit(2)
}

const confpath = path.resolve(dir, process.env.CONFIG_FILE || "config.json")

let config

if (fs.existsSync(confpath)) {
  const config_data = JSON.parse(fs.readFileSync(confpath).toString())
  config = MergeRecursive(config_data, defaults)
} else config = defaults

let exiting

function exit(code) {
  if (exiting) {
    node.logger("node").warn("Force stop!")
    return process.nextTick(() => process.exit(2))
  }
  exiting = true
  node.logger("node")("Stopping...")
  node.logger("node")("Press ^C to force stop")
  node.stop(err => {
    if (err) {
      node.logger("node").error(err)
      console.error("FAILED TO QUIT GRACEFULLY")
      throw err
    }
    node.logger("node")("Stopped")
    process.exit(code || 0)
  })
}

["SIGTERM", "SIGINT", "SIGUSR2"].forEach(sig => process.on(sig, exit))

require("peer-id").create((err, id) => {
  config.id = id
  node = new ZeroNet(config)
  dwait.map(d => d())
  dwait = null
  node.start(errCB)
})
