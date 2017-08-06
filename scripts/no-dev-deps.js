const file = process.argv[2]
const fs = require("fs")
const load = file => JSON.parse(fs.readFileSync(file).toString())
const save = (c, f) => fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n")
let c = load(file)
let devnames = {}

function del(o) {
  if (o.dev) return true
  for (var p in o) {
    if (typeof o[p] == "object") {
      if (del(o[p])) {
        console.log("del", o[p])
        devnames[p] = true
        delete o[p]
      }
    }
  }
}

function del2(o) {
  for (var p in o) {
    if (typeof o[p] == "object" && p == "requires") {
      for (var dev in o[p])
        if (devnames[dev]) {
          console.log("delreq", o, dev)
          delete o[p][dev]
        }
      if (!Object.keys(o[p]).length)
        delete o[p]
    } else if (typeof o[p] == "object") del2(o[p])
  }
}

del(c)
console.log(devnames)
del2(c)

save(c, file)
