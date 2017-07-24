"use strict"

const mockery = require("mockery")

let dwait = []

const _debug = require("debug")
const superlog = _debug("hacky-logs")

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
    try {
      if (global.ZeroLogWS) global.ZeroLogWS.write(JSON.stringify(data) + "\n")
      else que.push(data)
    } catch (e) {
      superlog(e)
    }
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
    try {
      if (global.ZeroLogWS) global.ZeroLogWS.write(JSON.stringify(data) + "\n")
      else que.push(data)
    } catch (e) {
      superlog(e)
    }
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

const bunyan = require("./bunyan") //we have patched that one

const Transform = require("stream").Transform

const through = new Transform({
  transform(data, enc, cb) {
    this.push(data)
    cb()
  }
})

const fakeProcess = { //the whole object is a lie
  env: process.env,
  versions: process.versions,
  platform: process.platform,
  stdin: through,
  stdout: process.stderr,
  stderr: process.stderr,
  on: () => {},
  //exit: code => exit(code)
}

bunyan(fakeProcess)

delete process.stdout
process.stdout = through

module.exports = dwait
