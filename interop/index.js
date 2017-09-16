"use strict"

const path = require("path")
require("app-module-path").addPath(path.join(__dirname, ".."))

const PeerId = require("peer-id")
const map = require("async/map")

//const sinon = require("sinon")
//const chai = require("chai")
//chai.use(require("sinon-chai"))
//chai.should()
//const expect = chai.expect
const assert = require("assert")

//global.sinon = sinon
//global.expect = expect
global.assert = assert
//global.chai = chai

before(function (cb) {
  map(require("../test/ids.json"), PeerId.createFromJSON, (e, ids) => {
    if (e) return cb(e)
    global.id = ids[0]
    global.ids = ids
    cb()
  })
})

const fs = require("fs")
const files = fs.readdirSync(__dirname + "/").filter(file => fs.lstatSync(__dirname + "/" + file).isDirectory()).sort()
const cp = require("child_process")

it.zero = (args, opts) => cp.spawn("docker", ["run", "-p", "13355:15541", "-p", "127.0.0.1:44220:43110", "mkg20001/zeronet-docker", process.env.DEBUG ? "--debug" : "--silent", "--ui_ip", "0.0.0.0"].concat(Array.isArray(args) ? args : [args]), opts || {
  stdio: "inherit"
})
it.zhost = cp.execSync("ip -4 addr show docker0 | grep -Po 'inet \\K[\\d.]+'").toString().split("\n").shift()

describe("zeronet", function () {
  files.forEach(file => {
    describe(file, function () {
      fs.readdirSync(__dirname + "/" + file).sort().forEach(function (file2) {
        if (file2.endsWith(".js")) require(__dirname + "/" + file + "/" + file2)
      })
    })
  })
})
