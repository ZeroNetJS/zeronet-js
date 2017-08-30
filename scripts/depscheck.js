"use strict"

const re = /require\(["'](.+)["']\)/gmi

let internal = ['assert',
  'buffer',
  'addons',
  'child_process',
  'cluster',
  'cli',
  'console',
  'crypto',
  "debug",
  'debugger',
  'deprecations',
  'dns',
  'domain',
  'errors',
  'events',
  'fs',
  'globals',
  'http',
  'https',
  'modules',
  'net',
  'os',
  'path',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'tracing',
  'tty',
  'dgram',
  'url',
  'util',
  'v8',
  'vm',
  'zlib'
].concat(["module"])

require("colors")

function getMatches(string, regex, index) {
  index = index || 1 // default to the first capturing group
  var matches = []
  var match
  while ((match = regex.exec(string)))
    matches.push(match[index])
  return matches
}

const path = require("path")
const fs = require("fs")

function getPkgDir(file) {
  while (!fs.existsSync(path.join(file, "package.json")) && file != "/")
    file = path.dirname(file)
  return file
}

let reqbymod = {}
let missing_mod = {}
let visited = {}

function checkDeps(file, modname, from) {
  if (visited[file]) return
  visited[file] = true
  let pkg = getPkgDir(file)
  let pjson = require(path.join(pkg, "package.json"))
  let node_modules = path.join(pkg, "node_modules")
  console.log("Checking %s (from %s)...".blue.bold, file, from)
  let c = fs.readFileSync(file).toString()
  let deps = getMatches(c, re).map(d => {
    let s = d.split("/")
    let m = s[0]
    let p = s.slice(1).join("/")
    if (m == ".") {
      return {
        local: true,
        path: p,
        fullpath: path.join(path.dirname(file), p)
      }
    } else {
      return {
        node: true,
        path: p,
        mod: m,
        zero: m.startsWith("zeronet"),
        own: m == modname,
        fullpath: path.join(node_modules, m)
      }
    }
  }).filter(d => internal.indexOf(d.mod) == -1).map(d => {
    if (d.own) {
      d = {
        local: true,
        path: d.path,
        fullpath: path.join(pkg, d.path)
      }
    }
    if (d.zero) {
      d.fullpath = d.fullpath.replace(/\/node_modules/g, "").replace(/zeronet-js\/zeronet-[a-z-]+\/(zeronet-[a-z-]+)/, "zeronet-js/$1")
      if (!d.path)
        d.path = require(path.join(d.fullpath, "package.json")).main
      d.fullpath = path.join(d.fullpath, d.path)
      if (!fs.existsSync(d.fullpath) && fs.existsSync(d.fullpath + ".js")) d.fullpath += ".js"
      if (fs.lstatSync(d.fullpath).isDirectory()) {
        d.path += "/index.js"
        d.fullpath += "/index.js"
      }
    }
    if (d.local) {
      if (!fs.existsSync(d.fullpath) && fs.existsSync(d.fullpath + ".js")) d.fullpath += ".js"
      if (!d.fullpath.endsWith(".js") && fs.existsSync(path.join(d.fullpath, "index.js"))) d.fullpath = path.join(d.fullpath, "index.js")
      if (!d.fullpath.endsWith(".js") && fs.existsSync(path.join(d.fullpath, "lib", "index.js"))) d.fullpath = path.join(d.fullpath, "lib", "index.js")
    }
    return d
  })
  let u = {}
  let dstr = deps.map(d => d.mod || d.path).filter(f => {
    let r = u[f]
    u[f] = true
    return !r
  })
  console.log("%s requires %s".grey.bold, file, dstr.join(", "))
  let enot = deps.filter(d => !d.zero).filter(d => !fs.existsSync(d.fullpath))
  if (enot.length) {
    console.log("%s modules were not found".red.bold, enot.map(m => {
      if (m.local) return m.path + " (" + m.fullpath + ")"
      else return m.mod + " (" + m.fullpath + ")"
    }).join(", "))
  }

  if (!pjson.dependencies) {
    console.log("%s has no dependencies filed".yellow.bold, path.join(pkg, "package.json"))
    pjson.dependencies = {}
  }
  if (!reqbymod[modname]) reqbymod[modname] = pjson.dependencies
  if (!missing_mod[modname]) missing_mod[modname] = {}
  let enopkg = deps.filter(d => !d.zero).filter(d => !d.local).filter(d => pjson.dependencies[d.mod] ? !delete reqbymod[modname][d.mod] : (missing_mod[modname][d.mod] = true))
  if (enopkg.length) {
    console.log("%s modules were not found in package.json".yellow.bold, enopkg.map(m => m.mod + " (" + m.fullpath + ")").join(", "))
  }

  deps.filter(d => d.local).forEach(d => checkDeps(d.fullpath, modname, file))
  deps.filter(d => d.zero).forEach(d => checkDeps(d.fullpath, d.mod, file))
}

checkDeps(fs.realpathSync("zeronet.js"), "zeronet", "__ENTRY");

[reqbymod, missing_mod].forEach(d => {
  for (var k in d)
    if (!Object.keys(d[k]).length) delete d[k]
})

console.log("unused deps\n", reqbymod)
console.log("missing deps\n", missing_mod);

[
  [reqbymod, "r"],
  [missing_mod, "i"]
].forEach(p => {
  for (var pkg in p[0]) {
    let d = p[0][pkg]
    console.error("cd " + pkg + " && npm " + p[1] + " --save " + Object.keys(d).join(" ") + " && cd ..")
  }
})
