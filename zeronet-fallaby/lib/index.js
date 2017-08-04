"use strict"

const clone = require("clone")

const types = ["content-json"]

function FallbackType(data) {
  const self = this
  const {
    version,
    type,
    fnc
  } = data
  self.shouldApply = (v) => {
    if (type != v.type) return false
    if (typeof version == "number") return v.int <= version
    if (typeof version == "string") return version == "*" || v.strv <= version
  }
  self.apply = (data, v) => fnc(data, v)
}

module.exports = function Fallback(type) {
  const self = this
  self.type = type
  self.fallbacks = []
  self.process = data_ => {
    let data = clone(data_)
    const v = self.parser(data)
    self.fallbacks.filter(f => f.shouldApply(v)).forEach(f => data = f.apply(data, v))
    return data
  }
  self.setParser = p => self.parser = p
  self.use = (v, t, f) => {
    if (typeof v == "function") {
      f = v
      t = "default"
      v = "*"
    }
    if (typeof t == "function") {
      f = t
      t = "default"
    }
    const type = new FallbackType({
      version: v,
      type: t,
      fnc: f
    })
    self.fallbacks.push(type)
  }
}

module.exports.types = types.map(t => t.replace(/-([a-z])/gmi, (_, n) => n.toUpperCase()))
module.exports.types.forEach(t => module.exports[t] = require("zeronet-fallaby/lib/types/" + t)())
