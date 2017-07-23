"use strict"

/*class Branch {
  constructor(name) {
    this.name = name
    this.authoritive = {}
  }
  getAllPaths() {
    let res = []
    for (var p in this.sub)
      res.push(p)
    return res
  }
  getPath() {
    let p = this
    let path = []
    while (p.parent) {
      path.unshift(p.name)
      p = p.parent
    }
    path.unshift(p.name)
    path.unshift("")
    return path.join("/")
  }
  verify() {

  }
}

class FileBranch extends Branch {
  constructor(name) {
    super(name)
  }
  verify() {

  }
}

class CJBranch extends Branch {
  constructor(name, dir) {
    super(name)
    dir.authoritive = this
    dir.sub["content.json"] = this
  }
}

class DirBranch extends Branch {
  constructor(name) {
    super(name)
    this.sub = {}
  }
  add(branch) {
    this.sub[branch.name] = branch
    branch.parent = this
  }
}

class RootTree extends Branch {
  consturctor() {
    super("")
  }
  add(branch) {
    this.sub[branch.name] = branch

    branch.parent = this
  }
  rebranch(inner_path, cj) {
    let np = inner_path.split("/")
    np.pop() //delete "content.json"
    const f = getInsidePath(np) //get that folder
  }
  getInsidePath(path) {
    const p = path.split("/")
    let b = []
    let c = this
    p.forEach(pat => {
      c = c.sub[pat]
      b.push(pat)
      if (!c) throw new Error("ENOTFOUND: " + b.join("/"))
    })
    return c
  }
}*/

/*class TreeBranch {
  consturctor(path) {
    this.relPath=path
  }
  verify() {

  }
}

class FileBranch extends TreeBranch {
  consturctor()
}

class CJBranch extends TreeBranch {
  constructor(path) {
    let np=path.split("/")
    np.pop() //remove "content.json from path"
    super(path)
  }
  verify() {

  }
  verifyAuthority() {

  }
}

module.exports = function ZeroFileTree() {
  const tree = new RootTree()

  function add(inner_path, cj) {
    tree.rebranch(inner_path, cj)
  }
}*/

const RuleBook = require("zeronet-zite/lib/rulebook")

class FileTreeObject {
  consturctor() {
    this.children = []
    this.type = "generic"
    this.updateTree()
  }
  exists(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    while (!s[0]) s.shift() //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
    if (!this.sub[s[0]]) return false
    return this.sub[s[0]].exists(s.slice(1))
  }
  get(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    while (!s[0]) s.shift() //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
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
    this.children(c => this.sub[c.path] = c)
  }
}

class FileTreeLeafObject extends FileTreeObject {
  constructor() {
    super()
    this.type = "leaf"
  }
  exists(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    while (!s[0]) s.shift() //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
    return !s.length //no files in here. we get an empty array if asked for our content
  }
  get(path) {
    let s = Array.isArray(path) ? path : path.split("/")
    while (!s[0]) s.shift() //fix for "/path/to/file" or "/path//to/file" or "//path/to/file"
    if (s.length) return false //no files in here. we get an empty array if asked for our content
    return this
  }
}

class FileTreeRoot extends FileTreeObject {
  constructor(address) {
    super()
    this.address = address
    this.type = "branch"
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
}

class ContentJSONBranch extends FileTreeLeafObject {
  constructor(cj) {
    super()
    this.authority = cj
    this.files = cj.data.files
  }
  verify(file, hash, size) {

  }
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
