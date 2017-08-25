const file = process.argv[2]
const fs = require("fs")
const load = file => JSON.parse(fs.readFileSync(file).toString())
const save = (c, f) => fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n")
let c = load(file)

const replace = {
  "github:mkg20001/multiplex": "multiplex",
  "github:mkg20001/multiplex#574b34aeddf291d1fc48fe422a78c5dd3d18dc01": "6.7.0",
  "multiplex": {
    "version": "6.7.0",
    "resolved": "https://registry.npmjs.org/mkg-multiplex/-/mkg-multiplex-6.7.0.tgz",
    "integrity": "sha512-5gfqqby0WL8OaUlo9KWSiPUSpI3hWnDWqJRkw5rbC/9eDuz4IgtC1bUE6f4E5jczTm1/cdyD6ucPkXu3JNOtjA==",
    "requires": {
      "debug": "3.0.1",
      "duplexify": "3.5.1",
      "readable-stream": "2.3.3",
      "varint": "5.0.0"
    }
  }
}

function del(o) {
  if (o.version && o.version.startsWith("github")) return true
  for (var p in o) {
    if (typeof o[p] == "object") {
      if (del(o[p])) {
        if (c.dependencies[p] && !del(c.dependencies[p])) {
          console.log("rep", o[p], c.dependencies[p])
          o[p] = c.dependencies[p]
        } else console.log("del", o[p], delete o[p])
      }
    } else if (typeof o[p] == "string" && o[p].startsWith("github")) {
      if (c.dependencies[p] && !del(c.dependencies[p])) {
        console.log("rep", o[p], c.dependencies[p].version)
        o[p] = c.dependencies[p].version
      } else console.log("del", o[p], delete o[p])
    }
  }
}

function repl(o) {
  for (var p in o) {
    if (typeof o[p] == "object") {
      if (o[p].version && replace[p]) o[p] = replace[p]
      else repl(o[p])
    } else if (typeof o[p] == "string") {
      const s = o[p]
      if (replace[s]) o[p] = replace[s]
    } else if (replace[p] && typeof o[p] == "object") {
      o[p] = replace[p]
    }
  }
}

repl(c)

del(c)

save(c, file)
