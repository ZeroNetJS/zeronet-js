const path = require("path")
require("app-module-path").addPath(path.join(__dirname, ".."))

const ZeroNet = require("lib/zeronet")
const Client = require("lib/client/index.js")
const PeerId = require("peer-id")

/*const zeronet = new ZeroNet({
  server: {
    host: "0.0.0.0",
    port: 15543
  }
})*/
global.Client = Client

const libp2p = require("index")

before(function (cb) {
  this.timeout(5000)
  PeerId.create((e, id) => {
    if (e) return cb(e)
    const zeroswarm = new libp2p({
      id,
      server: {
        host: "0.0.0.0",
        port: 15543
      }
    })
    const zeronet_swarm = zeroswarm.zeronet

    global.zeronetS = zeronet_swarm
    global.zeroswarm = zeroswarm

    const zeronet = new ZeroNet({
      server: {
        host: "0.0.0.0",
        port: 15544
      }
    })

    global.zeronetN = zeronet

    return cb()
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
