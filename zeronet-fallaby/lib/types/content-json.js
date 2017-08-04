"use strict"

const Fallback = require("zeronet-fallaby")

module.exports = function ContentJSONFallback() {
  const f = new Fallback("content.json")
  f.setParser((data) => {
    let v = data.zeronet_version.match(/(\d+)\.(\d+)\.(\d+)/)
    let vstr = v[1] + v[2] + (v[3].length == 1 ? "0" + v[3] : v[3])
    let vint = parseInt(vstr, 10)
    let isjs = data.zeronet_js
    return {
      int: vint,
      str: data.zeronet_version + (isjs ? "-js" : "-py"),
      strv: vstr,
      type: isjs ? "js" : "py"
    }
  })

  //Apply fixes
  //TODO: add
  //TODO: add fix for old sigs

  //Finally turn py content into js content
  f.use("*", "py", data => {
    if (!data.optional_files) data.optional_files = {}
    if (!data.files) data.files = {}
    let files = []
    let path
    for (path in data.files) {
      files.push({
        path,
        hash: data.files[path].sha512,
        size: data.files[path].size,
        type: "file",
        optional: false
      })
    }
    for (path in data.optional_files) {
      files.push({
        path,
        hash: data.files[path].sha512,
        size: data.files[path].size,
        type: "file",
        optional: true,
        id: parseInt(data.files[path].sha512.split("").slice(0, 4), 16)
      })
    }
    delete data.optional_files
    data.files = files
    return data
  })
}
