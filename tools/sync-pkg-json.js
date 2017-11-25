const pkg = process.argv[2]
const json = require(pkg)

const t = {
  "lint": "aegir lint",
  "build": "aegir build",
  "test": "aegir test",
  "test:node": "aegir test -t node",
  "test:browser": "aegir test -t browser",
  "release": "aegir release",
  "release-minor": "aegir release --type minor",
  "release-major": "aegir release --type major",
  "coverage": "aegir coverage",
  "coverage-publish": "aegir-coverage publish"
}

const targets = json.targets || []
targets.forEach(target => {
  ["test", "release", "release-minor", "release-major"].forEach(key => {
    t[key] += " -t " + target
  })
})

for (const p in t)
  json.scripts[p] = t[p]

require("fs").writeFileSync(pkg, Buffer.from(JSON.stringify(json, null, 2) + "\n"))
