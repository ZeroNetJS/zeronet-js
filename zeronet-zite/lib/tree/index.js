"use strict"

const RuleBook = require("zeronet-zite/lib/tree/rulebook")
const FS = require("zeronet-zite/lib/tree/fs")

class FileTreeObject {
  consturctor() {
    this.children = []
    this.type = "generic"
    this.updateTree()
  }
  exists(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    while (!s[0] && s.length) s.shift() //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
    if (!s.length) return true //self
    if (!this.sub[s[0]]) return false
    return this.sub[s[0]].exists(s.slice(1))
  }
  get(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    while (!s[0] && s.length) s.shift() //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
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
  }
}

class FileTreeLeafObject extends FileTreeObject {
  constructor() {
    super()
    this.type = "leaf"
  }
  exists(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    while (!s[0] && s.length) s.shift() //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
    return !s.length //no files in here. we get an empty array if asked for our content
  }
  get(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    while (!s[0] && s.length) s.shift() //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
    if (s.length) return false //no files in here. we get an empty array if asked for our content
    return this
  }
  updateTree() {

  }
}

class FileTreeRoot extends FileTreeObject {
  constructor(zite) {
    super()
    this.zite = zite
    this.address = zite.address
    this.type = "branch"
    this.children = [new DummyObject("content.json")] //TODO: chicken-egg-problem: if the content.json does not exist we can't queue it
    this.updateTree()
  }
  setMainBranch(branch) {
    //sets the main branch aka content.json
    this.authority = branch.authority
    this.children = branch.files
    this.updateTree()
  }
  getRuleBook() {
    //Returns rule book with 1Addr as only valid key
    return new RuleBook({
      valid_keys: this.address
    })
  }
  recalculatePath() {
    this.path = ""
  }
  attach(storage) {
    this.storage = storage
    this.fs = new FS(this.zite, this.storage, this)
  }
  build(cb) {
    cb()
  }
}

class DummyObject extends FileTreeLeafObject {
  constructor(name) {
    super()
    this.name = name
  }
}

class ContentJSONBranch extends FileTreeLeafObject {
  constructor(cj) {
    super()
    this.authority = cj
    this.files = cj.data.files
    this.name = "content.json"
  }
  /*verify(file, hash, size) {

  }*/
}

class FileBranch extends FileTreeLeafObject {
  constructor(file, cjbranch) {
    this.file = file
    this.authority = cjbranch.authority
  }
}

module.exports = FileTreeRoot
module.exports.ContentJson = ContentJSONBranch
module.exports.File = FileBranch
