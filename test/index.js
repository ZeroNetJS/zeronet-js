"use strict"

const path = require("path")
require("app-module-path").addPath(path.join(__dirname, ".."))

const PeerId = require("peer-id")

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
        if (file2.endsWith(".js")) require(__dirname + "/" + file + "/" + file2)
      })
    })
  })
})
