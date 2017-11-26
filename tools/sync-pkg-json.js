const pkg = process.argv[2]
const json = require(pkg)

console.log('Updating', pkg)

const t = {
  'lint': 'aegir lint',
  'build': 'aegir build',
  'test': 'aegir test',
  'test:node': 'aegir test -t node',
  'test:browser': 'aegir test -t browser',
  'release': 'aegir release',
  'release-minor': 'aegir release --type minor',
  'release-major': 'aegir release --type major',
  'coverage': 'aegir coverage',
  'coverage-publish': 'aegir coverage -u'
}

const targets = json.targets || []
targets.forEach(target => {
  ['test', 'release', 'release-minor', 'release-major'].forEach(key => {
    t[key] += ' -t ' + target
  })
})

for (const p in t) { json.scripts[p] = t[p] }

for (const pkg in json.dependencies) {
  json.dependencies[pkg] = json.dependencies[pkg].replace('^', '~')
}

if (!json.devDependencies) {
  json.devDependencies = {}
}

if (!json.devDependencies.aegir) {
  json.devDependencies.aegir = '^12.2.0'
}

json.directories = {
  test: 'test',
  src: 'src',
  lib: 'src'
}

require('fs').writeFileSync(pkg, Buffer.from(JSON.stringify(json, null, 2) + '\n'))
