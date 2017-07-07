"use strict"

const path = require("path")
require("app-module-path").addPath(path.join(__dirname, ".."))

const PeerId = require("peer-id")

const common = require("../zeronet-common")
const swarm = require("../zeronet-swarm")

before(function (cb) {
  this.timeout(5000)
  PeerId.create((e, id) => {
    if (e) return cb(e)

    global.id = id

    const listenSwarm = new swarm({
      id,
      server: {
        host: "0.0.0.0",
        port: 15543
      },
      server6: {
        host: "::",
        port: 15543
      }
    }, err => {
      if (err) return cb(err)

      const dialSwarm = new swarm({
        id
      }, err => {
        if (err) return cb(err)
      })

      return cb()

    })
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
