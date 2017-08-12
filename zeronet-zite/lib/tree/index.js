"use strict"

const RuleBook = require("zeronet-zite/lib/tree/rulebook")
const FS = require("zeronet-zite/lib/tree/fs")
const ContentJSON = require("zeronet-zite/lib/tree/content-json")
const _path = require("path")

const debug = require("debug")
const log = debug("zeronet:zite:tree")

function normalize(s) { //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
  while ((!s[0] || s[0] == ".") && s.length) s.shift()
}

class FileTreeObject {
  consturctor() {
    this.children = []
    this.type = "generic"
    this.updateTree()
  }
  toJSON() {
    let sub = {}
    Object.keys(this.sub).forEach(k => sub[k] = this.sub[k].toJSON())
    return {
      name: "",
      type: this.type,
      path: this.path,
      dummy: this.dummy,
      sub
    }
  }
  fromJSON() {
    //TODO: add
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
    // this.recalculatePath()
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
	log("Path", this.path)
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
  }
  toJSON() {
    return {
      name: this.name,
      type: this.type,
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
    if (this.json) this.fromJSON(this.json)
    delete this.json
    cb()
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
    this.dummy = true
  }
}

class ContentJSONBranch extends FileTreeLeafObject {
  constructor(cj) {
    super()
    this.authority = cj
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
    this.name = file.name
    this.relpath = file.relpath //TODO: use relpath to create empty nodes in the way
    this.authority = cjbranch.authority
  }
}

module.exports = FileTreeRoot
module.exports.ContentJson = ContentJSONBranch
module.exports.File = FileBranch
