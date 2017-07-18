const storage = require("zeronet-storage-memory")
const node = require("zeronet-node")

let n

it("should start", cb => {
  n = new node({
    storage: new storage(),
    id: global.id
  })
  n.start(cb)
})

it("should stop", cb => n.stop(cb))
