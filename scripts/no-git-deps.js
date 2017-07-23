const file = process.argv[2]
const fs = require("fs")
const load = file => JSON.parse(fs.readFileSync(file).toString())
const save = (c, f) => fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n")
let c = load(file)

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

del(c)

save(c, file)
