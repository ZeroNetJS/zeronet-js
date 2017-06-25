"use strict"

const MergeRecursive = require("merge-recursive")
const ZeroNet = require("zeronet-swarm")
const fs = require("fs")
const path = require("path")
const cp = require("child_process")

const bunyan = cp.spawn(process.argv[0], [__dirname + "/node_modules/.bin/bunyan"], {
  stdio: ["pipe", process.stderr, process.stderr]
})
delete process.stdout
process.stdout = bunyan.stdin

const defaults = {
  tls: "disabled",
  server: {
    host: "0.0.0.0",
    port: 15543
  },
  uiserver: {
    listen: {
      host: "127.0.0.1",
      port: 15544
    }
  },
  debug_file: path.resolve(process.cwd(""), "debug.log"),
  debug_shift_file: path.resolve(process.cwd(""), "debug-last.log")
}

const errCB = err => {
  if (!err) return
  console.error("The node failed to start")
  console.error(err)
  process.exit(2)
}

const confpath = path.resolve(process.cwd(""), process.env.CONFIG_FILE || "config.json")

let config

if (fs.existsSync(confpath)) {
  const config_data = JSON.parse(fs.readFileSync(confpath).toString())
  config = MergeRecursive(config_data, defaults)
} else config = defaults

require("peer-id").create((err, id) => {
  config.id = id
  new ZeroNet(config, errCB)
})
