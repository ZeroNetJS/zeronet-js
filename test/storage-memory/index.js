"use strict"

const store = require("zeronet-storage-memory")

const assert = global.assert

const testdata = ["testdata", 1, 2, 3]

let s

describe("json", () => {
  it("should write and read", cb => {
    s = new store()
    s.start(err => {
      if (err) return cb(err)
      s.json.write("test", testdata, err => {
        if (err) return cb(err)
        s.json.read("test", (err, data) => {
          if (err) return cb(err)
          assert(data, "no result")
          assert.deepEqual(data, testdata, "wrong data")
          return cb()
        })
      })
    })
  })

  afterEach(cb => s.stop(cb))
})
