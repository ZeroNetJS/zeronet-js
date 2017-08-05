"use strict"

const path = require("path")

module.exports = function File(zite, inner_path, cj, data) {
  const self = this
  const name = self.name = path.basename(inner_path)
  self.path = inner_path
  self.relpath = data.path
  self.info = data
  self.info.site = zite.address
}
