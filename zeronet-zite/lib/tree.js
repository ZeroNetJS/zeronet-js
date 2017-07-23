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

class FileTree {
  constructor(address) {
    this.address = address
  }
  setMainBranch(branch) {
    //sets the main branch aka content.json
    this.branch = branch
  }
  getRuleBook() {
    //Returns rule book with 1Addr as only valid key
  }
}

module.exports = FileTree
