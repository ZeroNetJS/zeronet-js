"use strict"

const m = require("module")
const debug = require("debug")
const log = debug("zeronet:swarm:mockery")
const we = "zeronet-swarm/hacks/"

module.exports = () => {
  let orig = m._load
  m._load = (request, parent, isMain) => {
    const p = request
    if (parent && parent.id.indexOf("multistream-select") != -1) {
      if ((parent.id.endsWith("multistream-select/src/index.js") || parent.id.endsWith("multistream-select\\src\\index.js")) && request == "./listener") request = we + "listener"
    }
    if (parent && parent.id.indexOf("interface-connection") != -1) {
      if ((parent.id.endsWith("interface-connection/src/index.js") || parent.id.endsWith("interface-connection\\src\\index.js")) && request == "./connection") request = we + "connection"
    }
    if (p != request) log("mocking %s to %s for %s", p, request, parent.id)
    return orig(request, parent, isMain)
  }
}
