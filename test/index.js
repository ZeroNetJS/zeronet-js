const path = require("path")
require("app-module-path").addPath(path.join(__dirname, ".."))

const ZeroNet = require("lib/zeronet")
const Client = require("lib/client/index.js")

const zeronet = new ZeroNet({
  server: {
    host: "0.0.0.0",
    port: 15543
  }
})

global.zeronet = zeronet
global.Client = Client

const fs = require("fs")
const files = fs.readdirSync(__dirname + "/").filter(file => fs.lstatSync(__dirname + "/" + file).isDirectory()).sort()

describe("zeronet", function () {
  files.forEach(file => {
    describe(file, function () {
      fs.readdirSync(__dirname + "/" + file).sort().forEach(function (file2) {
        require(__dirname + "/" + file + "/" + file2)
      })
    })
  })
})
