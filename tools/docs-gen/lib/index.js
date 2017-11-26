"use strict"

require("colors")

const jsdoc2md = require("jsdoc-to-markdown")

const Renderable = require("./renderable")
const rend = () => new Renderable() //shortcut

const path = require("path")

const debug = require("debug")
const log = debug("zeronet:docs")

function warn(a, b) {
  console.warn("WARN:".yellow.bold + " " + a.white, b.yellow.bold)
}

function renderFncArgs(pre, d) { //TODO: fix
  if (!pre) pre = ""
  if (d.undocumented) return "`" + pre + "( /* seems like that's not documented yet */ )" + "`"
  return "`" + pre + "(" + (d.params || []).map(p => p.name || "unnamed").join(", ") + ")" + "`"
}

function renderDesc(d) {
  return d.description ? ("\n" + d.description).split("\n").join("\n > ").split("\n").slice(1) : []
}

function an(w) {
  if (w.startsWith("a") || w.startsWith("e") || w.startsWith("i") || w.startsWith("o") || w.startsWith("u")) return "an"
  return "a"
}

function renderParamStandaloneDesc(d, param) {
  if (param.description) {
    return param.description
  } else {
    if (param.type.names.length > 1) {
      return "Can be any type of " + param.type.names.join(", ")
    } else {
      return "Must be " + an(param.type.names[0]) + " " + param.type.names[0]
    }
  }
}

function renderParamDesc(d) {
  let r = rend()
  if (d.undocumented) return r;
  (d.params || []).map(param => {
    if (param.type.names[0] == "callback") {
      r.add("`callback` is a function that will be called after the operation finishes with the following argument(s), if applicable: " + (param.description || "`err`: the resulting error"), true)
    } else {
      r.add(" - " + (param.name || "unnamed") + ": " + renderParamStandaloneDesc(d, param))
    }
  })
  return r
}

function FilesCollection(list, name, docs) {
  const log = debug("zeronet:docs:file-collection")
  let map
  let nomap = false

  const self = this
  self.name = name
  self.forEach = cb => list.forEach(cb)
  self.full = name
  if (!name.endsWith(".js")) {
    if (name) self.full += "/index.js"
    else self.full = "index.js"
  }
  self.displayName = name ? docs.name + "/" + name : docs.name

  log("processing", name)

  list.forEach(c => { //this check needs to be done before, because module.exports is at the end
    if (c.longname == "module.exports" && c.kind == "member" && c.scope == "static") { //module.exports is an object with sub-objects, not a class. requires a shadow class
      nomap = true
      map = "Shadow"
    }
  })

  if (!nomap) map = null
  self.hasShadow = nomap

  list.forEach(c => {
    if (c.kind == "class" && c.scope == "global" && !map && !c.name.startsWith("module.exports") && !nomap)
      map = c.name
  })

  if (nomap) log("mapping to shadow-root", map, self.full)
  else log("selected root-map", map, self.full)

  function mapName(c) {
    function str(i) {
      if (!i) return i
      if (i.startsWith("module.exports")) {
        log("mapping %s to %s in %s", i, i.replace(/^module\.exports/, map), self.full)
        return i.replace(/^module\.exports/, map)
      } else return i
    }
    ["memberof", "longname"].forEach(i => c[i] = str(c[i]))
    if (c.meta.vars) Object.keys(c.meta.vars).forEach(d => str(c.meta.vars[d]))
  }

  if (map) list.forEach(mapName)
}

function ModuleDocs(mod, basepath) {
  const self = this
  let _files = {}
  let files = self.files = []
  self.name = mod
  log("module docs %s with base %s", mod, basepath)
  self.addFile = (file, data) => {
    file = path.relative(basepath, file)
    log("adding file %s: lineno=%s, kind=%s, scope=%s, longname=%s", file || "index.js", data.meta.lineno, data.kind, data.scope, data.longname)
    if (!_files[file]) _files[file] = []
    _files[file].push(data)
  }
  self.prepare = () => {
    for (var file in _files)
      files.push(new FilesCollection(_files[file].sort((a, b) => a.meta.lineno - b.meta.lineno), file, self))
  }
  self.render = parts => {
    let r = rend()
    r.add("# API")
    parts.forEach(p => r.add(p.render(), true))
    return r
  }
}

function ClassFunctionDocs(name, jsdoc, cl) {
  const self = this
  self.doc = jsdoc
  self.name = name.split(/[~#]/).pop()
  if (self.name.startsWith("self.")) self.name = self.name.substr(5)
  cl.addSub(self)
  self.render = () => {
    let r = new Renderable()
    if (jsdoc.access == "private") return r
    r.add("#### " + renderFncArgs(cl.name + "." + self.name, jsdoc))
    if (jsdoc.undocumented) {
      warn("Undocumented function", cl.name + "." + self.name)
    } else {
      r.add(renderDesc(jsdoc), true)
      r.add(renderParamDesc(jsdoc), true)
    }
    return r
  }
}

function ClassDocs(name, jsdoc, part) {
  const self = this
  self.doc = jsdoc

  let sub = []
  let byid = {}
  self.el = byid
  self.name = name

  self.addSub = fnc => {
    sub.push(fnc)
    byid[fnc.name] = fnc
  }

  self.render = () => {
    let r = new Renderable()
    if (jsdoc.access == "private") return r
    r.add("### Class " + name, true)
    if (jsdoc.undocumented) {
      warn("Undocumented class", name)
    } else {
      r.add("#### Constructor - " + renderFncArgs("new " + part.codeFriendlyName + "." + self.name, jsdoc), true)
      r.add(renderDesc(jsdoc), true)
      r.add(renderParamDesc(jsdoc), true)
    }
    sub.forEach(s => r.add(s.render(), true))
    return r
  }
}

function PartDocs(file, parent) {
  const self = this
  let classes = []
  let cbyid = {}

  self.name = file.name
  self.display = file.displayName
  self.codeName = self.display.endsWith("index.js") ? path.dirname(self.display) : self.display
  self.codeName = self.codeName.split("/").pop().split("-")
  if (self.codeName.length > 1) self.codeName = self.codeName.slice(1)
  self.codeName = self.codeName.join("-").replace(/-/g, "_")
  self.codeFriendlyName = self.codeName.split(".")[0]
  self.friendlyName = self.name ? self.display.split("/").slice(1).join("/") : parent.name

  self.addClass = (name, jsdoc) => {
    const c = new ClassDocs(name, jsdoc, self)
    classes.push(c)
    cbyid[name] = c
  }

  self.addMember = (name, jsdoc) => {
    const s = name.split(/[~#]/)
    const c = s[0]
    if (!cbyid[c]) throw new Error("Class " + c + " for member " + name + " does not exist")
    const cl = cbyid[c]
    new ClassFunctionDocs(name, jsdoc, cl) //registers itself
  }

  self.render = () => {
    let r = rend()
    if (!classes.length) return r
    r.add("## API for " + self.friendlyName, true)
    classes.forEach(c => r.add(c.render(), true))
    if (r.toString().replace(/\n/g, "").trim() == "## API for " + self.friendlyName) return rend()
    return r
  }
}

function prepare(jsdoc, mod) {
  log("prepare")

  const pkg = jsdoc.filter(f => f.kind == "package")[0]
  let mainpath = pkg.files.reduce((a, b) => {
    let na = "",
      nb = ""
    let sa = a.split("")
    let sb = b.split("")
    while (na == nb) {
      na += sa.shift()
      nb += sb.shift()
    }
    return na.substr(0, na.length - 1)
  }, pkg.files[0] + ".")
  if (!mainpath.endsWith("/")) mainpath = path.dirname(mainpath)

  const res = new ModuleDocs(mod, mainpath)

  jsdoc.filter(f => f.kind != "package" && f.meta)
    .map(f => res.addFile(path.join(f.meta.path, f.meta.filename), f))

  res.prepare()

  return res
}

function RenderDocs(mod, files, conf, cb) {
  //Render docs for module "mod" from array "files"

  log("docs", mod, files, conf)

  function d(jsdoc) {
    try {
      const docs = prepare(jsdoc, mod)
      let parts = []
      docs.files.forEach(file => {
        let part = new PartDocs(file, docs)
        log("documenting", file.name)
        parts.push(part)
        file.forEach(doc => {
          if (doc.kind == "class" && doc.scope == "global") part.addClass(doc.name, doc)
          else if (doc.kind == "function" && doc.memberof && !doc.memberof.startsWith("module") && !doc.memberof.startsWith("<anonymous>") && !doc.longname.startsWith("module") && !doc.longname.startsWith("<anonymous>")) part.addMember(doc.longname, doc)
          else log("Unknown", doc.kind, doc.scope, doc.longname)
        })
      })
      log("rendering")
      let res = docs.render(parts)
      if (res.getAll().length < 4) res = rend() //Remove API header if there are no docs or just empty class docs
      res.add(conf.footer || "Docs are autogenerated by a script", true)
      return cb(null, res.toString())
    } catch (e) {
      return cb(e)
    }
  }

  jsdoc2md.getJsdocData({
      files,
      jsdoc: true
    })
    .then(jsdoc => {
      process.nextTick(d, jsdoc)
    })
    .catch(cb)
}

module.exports = RenderDocs
