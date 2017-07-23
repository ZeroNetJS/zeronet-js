"use strict"

const FileStream = require("zeronet-zite/lib/file-stream")

function ItemInQueue(queue, zite, pool) {
  const self = this
}

module.exports = function Queue(zite) {
  const self = this
  const tree = zite.tree

  let queue = {}
  let items = []

  function get(url) {
    return queue[url]
  }

  self.inQueue = url => !!get(url)

  self.add = url => {
    if (self.inQueue(url)) return get(url)
    if (tree.exists(url) || tree.maybeValid(url)) {

    }
  }
}
