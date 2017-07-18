"use strict"

const file = process.argv[2]
const fs = require("fs")
if (!fs.existsSync(file)) throw new Error(file + " does not exist")

const jsdoc2md = require("jsdoc-to-markdown")

/*const extract = require("extract-comments")
const jsdoc = require("jsdoc-parse")

let content = fs.readFileSync(file).toString()*/
/*let comments = extract.block(content).filter(c => c.value.indexOf("\n") != -1)*/
/*.map(c => {
  c.jsdoc = jsdoc(c.value.split("\n"))
  return c
})*/ //valid doc comments are multi-line block comments

//console.log(comments)

function renderFncArgs(pre, d) { //TODO: fix
  if (!pre) pre = ""
  if (d.undocumented) return "`" + pre + "( /* seems like that's not documented yet */ )" + "`"
  return "`" + pre + "(" + d.params.map(p => "<" + p.type.names.join(", ") + ">" + (p.name || "unnamed")).join(", ") + ")" + "`"
}

function renderDesc(d) {
  return d.description ? [""].concat(("\n" + d.description).split("\n").join("\n > ").split("\n").slice(1), [""]) : [""]
}

function Renderable() {
  let all = []
  const self = this
  self.add = (c, i) => c instanceof Renderable ? self.add(c.getAll(), i) : !i ? Array.isArray(c) ? all = all.concat(c) : all.push(c) : c.length ? self.add([""].concat(c, [""])) : false
  self.render = () => all.join("\n")
  self.getAll = () => all
}

function Class(name, jsdoc) {
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
    r.add(["#### Class " + name, ""])
    if (jsdoc.undocumented) {
      console.warn("WARN: Undocumented class", name)
    } else {
      r.add("#### Constructor - " + renderFncArgs("new " + self.name, jsdoc))
      r.add(renderDesc(jsdoc))
    }
    sub.forEach(s => r.add(s.render(), true))
    return r
  }
}

function ClassFnc(name, jsdoc, cl) {
  const self = this
  self.doc = jsdoc
  self.name = name.split("~").pop()
  if (self.name.startsWith("self.")) self.name = self.name.substr(5)
  cl.addSub(self)
  self.render = () => {
    let r = new Renderable()
    r.add("#### " + renderFncArgs(cl.name + "." + self.name, jsdoc))
    return r
  }
}

function Classes() {
  const self = this
  let classes = []
  let byid = {}
  self.addClass = (name, jsdoc) => {
    const c = new Class(name, jsdoc)
    classes.push(c)
    byid[name] = c
  }
  self.addMember = (name, jsdoc) => {
    const s = name.split("~")
    const c = s[0]
    if (!byid[c]) throw new Error("Class " + c + " for member " + name + " does not exist")
    const cl = byid[c]
    new ClassFnc(name, jsdoc, cl) //registers itself
  }
  self.el = byid

  self.render = () => {
    let r = new Renderable()
    r.add("## API")
    classes.forEach(c => r.add(c.render(), true))
    return r
  }
}

function mapName(c, n) {
  function str(i) {
    if (!i) return i
    if (i.startsWith("module.exports")) return i.replace(/^module\.exports/, n)
    else return i
  }
  ["memberof", "longname"].forEach(i => c[i] = str(c[i]))
  if (c.meta.vars) Object.keys(c.meta.vars).forEach(d => str(c.meta.vars[d]))
}

jsdoc2md.getJsdocData({
    files: [file],
    jsdoc: true
  })
  .then(json => {
    let d = json.filter(c => !!c.meta).filter(c => c.kind != "constant").sort((a, b) => a.meta.lineno - b.meta.lineno)
      .map(c => {
        if (!c.meta) return
        console.log(require("util").inspect(c, {
          depth: Infinity,
          colors: true
        }))
        return c
      })
      .filter(e => !!e)
    const cls = new Classes()
    let map
    d.forEach(c => {
      console.log(c.kind, c.scope, c.longname)
      if (c.kind == "class" && !map && c.name != "module.exports") {
        console.log("Using %s as mapping for module.exports", c.name)
        map = c.name
      }
      if (map) mapName(c, map)
      if (c.kind == "class" && c.scope == "global") cls.addClass(c.name, c)
      else if (c.kind == "function" && c.memberof && !c.memberof.startsWith("module") && !c.longname.startsWith("module")) cls.addMember(c.longname, c)
      else console.warn("Unknown", c.kind, c.scope, c.longname)
    })
    console.log(require("util").inspect(cls, {
      depth: Infinity,
      colors: true
    }))
    console.log(cls.render().render())
  })
