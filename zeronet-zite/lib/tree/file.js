const path = require("path")

module.exports = function File(zite, inner_path, cj, data) {
  const name = self.name = path.basename(inner_path)
  self.path = inner_path
  self.relpath = data.path
}
