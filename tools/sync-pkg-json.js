const pkg = process.argv[2]
const repo = process.argv[3]
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

const vRe = /.*([0-9]+)\.([0-9]+)\.([0-9]+)/

for (const pkg in json.dependencies) {
  let v = json.dependencies[pkg]
  const vs = v.match(vRe)
  console.log(v, vs)
  if (vs) {
    v = vs[1] + '.' + vs[2] + '.' + vs[3]
    if (parseInt(vs[2], 10)) v = '~' + vs[1] + '.' + vs[2] + '.' + vs[3]
    if (parseInt(vs[1], 10)) v = '^' + vs[1] + '.' + vs[2] + '.' + vs[3]
    json.dependencies[pkg] = v
  }
}

if (!json.devDependencies) {
  json.devDependencies = {}
}

if (!json.devDependencies.aegir) {
  json.devDependencies.aegir = '^12.4.0'
}

if (repo) {
  const tmp = {
    'repository': {
      'type': 'git',
      'url': 'git+https://github.com/ZeroNetJS/' + repo + '.git'
    },
    'bugs': {
      'url': 'https://github.com/ZeroNetJS/' + repo + '/issues'
    },
    'homepage': 'https://github.com/ZeroNetJS/' + repo + '#readme'
  }
  Object.assign(json, tmp)
}

json.directories = {
  test: 'test',
  src: 'src',
  lib: 'src'
}

require('fs').writeFileSync(pkg, Buffer.from(JSON.stringify(json, null, 2) + '\n'))
