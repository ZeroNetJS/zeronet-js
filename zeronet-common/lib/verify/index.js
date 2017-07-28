"use strict"

const uuid = require("uuid")

function debugDef(d_) {
  let def = {}
  for (var key in d_) {
    def[key] = Array.isArray(d_[key]) ? d_[key] : [d_[key]]
    def[key] = def[key].map(e => typeof e == "function" ? "[function] " + e.toString().split("\n")[0] : e)
    if (def[key].length == 1) def[key] = def[key][0]
  }
  return def
}

function verifyProtocol(def, param) {
  //validate if "param" matches "def"
  try {
    for (var p in def) {
      let dd
      if (!Array.isArray(def[p])) dd = [def[p]]
      else dd = def[p]
      let v = false
      dd.forEach(d => {
        if (v) return
        switch (typeof d) {
        case "function":
          if (!d(param[p])) throw new Error("Invalid value for key " + p + " (validation function)")
          v = true
          break
        case "string":
          if (typeof param[p] != d) throw new Error("Invalid value for key " + p + " (type missmatch expected=" + d + ", got=" + param[p] + ")")
          v = true
          break
        }
      })
    }
  } catch (e) {
    e.stack +=
      "\n\n    --- Definition ---\n    " + JSON.stringify(debugDef(def), null, 2).split("\n").join("\n    ") +
      "\n\n    --- Object ---\n    " + JSON.stringify(param, null, 2).split("\n").join("\n    ")
    throw e
  }
}

function verifyAddress(adr) {
  if (typeof adr != "string") return false
  return !!adr.match(/^1[A-Z0-9a-z]{32,33}$/)
}

function verifyNamecoin(adr) {
  if (typeof adr != "string") return false
  return !!adr.match(/^[a-z0-9A-Z-]+\.bit$/)
}

function genNonce() {
  return (uuid() + uuid()).replace(/-/g, "")
}

module.exports = {
  verifyProtocol,
  verifyAddress,
  verifyNamecoin,
  genNonce
}
