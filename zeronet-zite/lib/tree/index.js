"use strict"

const pull = require("pull-stream")
const JSONStream = require("zeronet-zite/lib/file/json")

const RuleBook = require("zeronet-zite/lib/tree/rulebook")
const FS = require("zeronet-zite/lib/tree/fs")
const ContentJSON = require("zeronet-zite/lib/tree/content-json")
const _path = require("path")

const debug = require("debug")
const log = debug("zeronet:zite:tree")

function normalize(s) { //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
  while ((!s[0] || s[0] == ".") && s.length) s.shift()
}

const map = require("async/map")

const subtable = {}

/*
Tree creation process:
 - Root branch gets created
   - Loads json
create(cj)
   - cj.dummy
    - true
     - set sub = [cj]
    - false
     - setMainBranch(cj)
*/

function handleCreation(storage, root, cj, cur, data, cb) {
  if (data.type == "generic" || data.subtype == "generic") throw new Error("Generic element found!")
  const cl = subtable[data.subtype]
  if (!cl) throw new Error("No class for subtype " + data.subtype)
  let it
  switch (data.type) {
  case "leaf":
    data.path = data.path.split("/").slice(1).join("/")
    switch (data.subtype) {
    case "contentjson":
      storage.getFile(data.path, (err, stream) => { //load the content json first time
        if (err) return cb(err)
        pull(
          stream,
          JSONStream.parse(),
          pull.drain(cj => {
            cj = new ContentJSON(root.zite, data.path, cj)
            if (!cj.verifySelf()) return cb(new Error("Verification failure"))
            it = new cl(cj)
            cb(null, it)
          })
        )
      })
      break;
    case "dummy":
      it = new cl()
      cb(null, it)
      break;
    case "file":
      it = cj.files.filter(f => f.relpath == data.path)[0]
      it.version = data.version
      cb(null, it)
      break;
    }

    break;

  case "branch":
    switch (data.subtype) {
    case "root":
    case "branch":
      if (data.subtype == "root") it = root
      else it = new cl()
      handleCreation(storage, root, it, null, data.sub["content.json"], (err, rootcj) => {
        if (err) return cb(err)
        it.children = [rootcj]
        if (rootcj.dummy) {
          cb(null, it)
        } else {
          it.authority = rootcj.authority
          map(Object.keys(data.sub), (path, next) => {
            if (path == "content.json") return next()
            handleCreation(storage, root, rootcj, it, data.sub[path], next)
          }, (e, r) => {
            if (e) return cb(e)
            r.filter(e => !!e).forEach(d => it.add(d))
            if (data.subtype == "root") it.updateTree()
            cb(null, it)
          })
        }
      })
      break;
    case "folder":
      it = new cl()
      it.name = _path.basename(data.path)
      it.authority = cj.authority
      map(Object.keys(data.sub), (path, next) => {
        handleCreation(storage, root, cj, it, data.sub[path], next)
      }, (e, r) => {
        if (e) return cb(e)
        r.forEach(d => it.add(d))
        cb(null, it)
      })
      break;
    }

    break;
  }
}

class FileTreeObject {
  consturctor() {
    this.children = []
    this.type = "generic"
    this.subtype = "generic"
    this.updateTree()
  }
  toJSON() {
    let sub = {}
    Object.keys(this.sub).forEach(k => sub[k] = this.sub[k].toJSON())
    return {
      name: "",
      type: this.type,
      subtype: this.subtype,
      version: this.version,
      path: this.path,
      dummy: this.dummy,
      sub
    }
  }
  exists(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    normalize(s)
    if (!s.length) return true //self
    if (!this.sub[s[0]]) return false
    return this.sub[s[0]].exists(s.slice(1))
  }
  get(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    normalize(s)
    if (!s.length) return this //self
    if (!this.sub[s[0]]) return false
    return this.sub[s[0]].get(s.slice(1))
  }
  loadContent(path) {
    let obj = this.get(path)
    if (!obj) throw new Error("ENOTFOUND: " + path.toString())
    if (obj.type != "leaf") throw new Error("EINVALID: Cannot execute action loadContent on " + obj.type + " " + path.toString())
    return obj.loadContent()
  }
  updateTree() {
    this.sub = {}
    this.recalculatePath()
    this.children.forEach(c => {
      c.parent = this
      c.recalculatePath()
      c.updateTree()
      this.sub[c.name] = c
    })
  }
  recalculatePath() {
    let path = [this.name]
    let p = this
    while (p.parent) {
      path.unshift(p.parent.name)
      p = p.parent
    }
    this.path = path.join("/")
    log("calculated path", this.path)
  }
  getAll() {
    let r = []
    this.children.map(c => r = r.concat(c.getAll()))
    return r
  }
}

class FileTreeLeafObject extends FileTreeObject {
  constructor() {
    super()
    this.type = "leaf"
    this.subtype = "leaf"
    this.version = 0
  }
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      subtype: this.subtype,
      version: this.version,
      path: this.path,
      dummy: this.dummy
    }
  }
  exists(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    normalize(s)
    return !s.length //no files in here. we get an empty array if asked for our content
  }
  get(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    normalize(s)
    if (s.length) return false //no files in here. we get an empty array if asked for our content
    return this
  }
  updateTree() {

  }
  getAll() {
    return [this.path]
  }
}

class FileTreeFolderObject extends FileTreeObject {
  constructor() {
    super()
    this.type = "branch"
    this.subtype = "folder"
    this.children = []
    this.updateTree()
  }
  add(file) {
    this.children.push(file)
  }
}

class FileTreeBranchObject extends FileTreeFolderObject {
  constructor() {
    super()
    this.type = "branch"
    this.subtype = "branch"
  }
  setMainBranch(branch) {
    //sets the main branch aka content.json
    this.authority = branch.authority
    this.children = []
    this.add(branch)
    branch.files.forEach(f => {
      let s = f.relpath.split("/")
      normalize(s)
      let p = this
      while (s.length - 1) {
        const f = s.shift()
        if (!p.get(f)) {
          const fb = new FileTreeFolderObject()
          fb.name = f
          p.add(fb)
          p.sub[f] = fb
        }
        p = p.get(f)
      }
      p.add(f)
    })
    this.updateTree()
  }
}

class FileTreeRoot extends FileTreeBranchObject {
  constructor(zite, json) {
    super()
    this.zite = zite
    this.subtype = "root"
    this.address = zite.address
    this.children = [new DummyObject("content.json")] //TODO: chicken-egg-problem: if the content.json does not exist we can't queue it
    this.json = json
    this.updateTree()
  }
  getRuleBook(path, data) {
    let valid_signers = []
    if (path == "content.json") {
      if (data.signers) valid_signers = Object.keys(data.signers)
      if (valid_signers.indexOf(this.address) == -1) valid_signers.push(this.address) //Address is always a valid signer

      return {
        signers_sign: new RuleBook({ //Returns rule book with 1Addr as only valid key
          valid_keys: this.address,
          signs_required: 1
        }),
        signs: new RuleBook({
          valid_keys: valid_signers,
          signs_required: data.signs_required || 1
        })
      }
    } else throw new Error("WIP")
  }
  recalculatePath() {
    this.path = ""
  }
  attach(storage) {
    this.storage = storage
    this.fs = new FS(this.zite, this.storage, this)
  }
  build(cb) {
    if (this.json) handleCreation(this.fs, this, null, this, this.json, cb)
    else cb()
    delete this.json
  }
  handleContentJSON(path, data) {
    let rule
    if (!(rule = this.getRuleBook(path, data))) return false //it's invalid
    const cj = new ContentJSON(this.zite, path, data)
    if (!cj.verifySelf()) return false //cryptography says no
    const dir = _path.dirname(path)
    const branch = new ContentJSONBranch(cj)
    if (!this.get(dir)) {
      //TODO: not needed for now as no multi-user and multi-content is done
    }
    this.get(dir).setMainBranch(branch)
    this.zite.downloadLoop()
    return true
  }
}

class DummyObject extends FileTreeLeafObject {
  constructor(name) {
    super()
    this.name = name
    this.subtype = "dummy"
    this.dummy = true
  }
}

class ContentJSONBranch extends FileTreeLeafObject {
  constructor(cj) {
    super()
    this.authority = cj
    this.subtype = "contentjson"
    this.name = "content.json"
    this.rules = cj.rules
    this.files = cj.files.map(file => new FileBranch(file, this))
  }
  verify(file, hash, size) {
    return this.authority.verify(file, hash, size)
  }
}

class FileBranch extends FileTreeLeafObject {
  constructor(file, cjbranch) {
    super()
    this.file = file
    this.subtype = "file"
    this.name = file.name
    this.relpath = file.relpath
    this.authority = cjbranch.authority
  }
}

subtable.generic = FileTreeObject

subtable.branch = FileTreeBranchObject
subtable.folder = FileTreeFolderObject
subtable.root = FileTreeRoot

subtable.leaf = FileTreeLeafObject
subtable.dummy = DummyObject
subtable.contentjson = ContentJSONBranch
subtable.file = FileBranch

module.exports = FileTreeRoot
module.exports.contentjson = ContentJSONBranch
module.exports.File = FileBranch
