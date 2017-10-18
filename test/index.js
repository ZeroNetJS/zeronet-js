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
  map(require("./ids.json"), PeerId.createFromJSON, (e, ids) => {
    if (e) return cb(e)
    global.id = ids[0]
    global.ids = ids
    cb()
  })
})

const fs = require("fs")
const files = fs.readdirSync(__dirname + "/").filter(file => fs.lstatSync(__dirname + "/" + file).isDirectory()).sort()
const cp = require("child_process")

let pythonAvailable = false
let pythonPath = false

const py = ["python2", "python"].filter(py => {
  try {
    cp.execSync(py + " " + path.join(__dirname, "py_test.py"))
    return true
  } catch (e) {
    return false
  }
})

if (py.length) {
  pythonPath = py[0]
  pythonAvailable = true
  console.log("Python found as", pythonPath)
} else {
  console.error("WARN: Python2 is not available or not in your path. Python tests will be skipped.")
  console.error("WARN: It is recommended you fix this")
}

it.python = (name, fnc) => {
  (pythonAvailable ? it : it.skip)(name, fnc)
}
it.py = pythonPath

describe("zeronet", function () {
  files.forEach(file => {
    describe(file, function () {
      fs.readdirSync(__dirname + "/" + file).sort().forEach(function (file2) {
        if (file2.endsWith(".js")) require(__dirname + "/" + file + "/" + file2)
      })
    })
  })
})

after(() => setTimeout(() => process.exit(0), 1000))
