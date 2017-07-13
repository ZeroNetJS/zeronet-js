"use strict"

const path = require("path")
require("app-module-path").addPath(path.join(__dirname, ".."))

const PeerId = require("peer-id")

before(function (cb) {
  this.timeout(5000)
  PeerId.create((e, id) => {
    if (e) return cb(e)
    global.id = id
    cb()
  })
})

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
