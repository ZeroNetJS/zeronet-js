"use strict"

const mockery = require("mockery")

let node
let dwait = []

const _debug = require("debug")

mockery.enable({
  warnOnReplace: false,
  warnOnUnregistered: false
})

mockery.registerMock("debug", function createDebug(name) {
  let que = []
  let qq = false
  let rd
  if (process.env.DEBUG) {
    rd = _debug(name)
  }

  function write(data) {
    if (global.ZeroLogWS) global.ZeroLogWS.write(JSON.stringify(data) + "\n")
    else que.push(data)
  }

  function processQue() {
    if (!qq) {
      dwait.push(processQue)
      qq = true
    }
    que.forEach(d => write(d))
    que = null
  }

  function debug() {
    write({
      debug: true,
      time: new Date().getTime(),
      name,
      data: [...arguments]
    })
    if (rd) rd.apply(rd, arguments)
  }

  return debug
})

function consoleMock(type) {
  let que = []
  let qq = false
  let rd
  const o = console[type].bind(console)

  function write(data) {
    if (global.ZeroLogWS) global.ZeroLogWS.write(JSON.stringify(data) + "\n")
    else que.push(data)
  }

  function processQue() {
    if (!qq) {
      dwait.push(processQue)
      qq = true
    }
    que.forEach(d => write(d))
    que = null
  }

  const d = {
    "bound consoleCall": function () {
      write({
        console: true,
        time: new Date().getTime(),
        type,
        data: [...arguments]
      })
      o.apply(o, arguments)
    }
  }

  return d["bound consoleCall"]
}

Object.keys(console).forEach(key => {
  console[key] = consoleMock(key)
})

const fs = require("fs")
const path = require("path")
const cp = require("child_process")

const MergeRecursive = require("merge-recursive")
const ZeroNet = require("zeronet-swarm")

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
  server6: {
    host: "::",
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

require("zeronet-crypto/node_modules/peer-id").create((err, id) => {
  config.id = id
  node = new ZeroNet(config, errCB)
  dwait.map(d => d())
  dwait = null
})
