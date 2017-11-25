const storage = require("zeronet-storage-memory")
const node = require("zeronet-node")

let n

it("should start", cb => {
  n = new node({
    storage: new storage(),
    id: global.id
  })
  n.start(cb)
}).timeout(20000)

it("should stop", cb => n.stop(cb))

it("should start as bundle", cb => {
  n = require("../..")({
    id: global.id
  })
  n.start(cb)
}).timeout(20000)

it("should stop as bundle", cb => n.stop(cb))
