"use strict"

const fs = require("mock-fs")
const store = require("zeronet-storage-fs")

const assert = global.assert

const testdata = ["testdata", 1, 2, 3]

function jbuf(o) {
  return new Buffer(JSON.stringify(o))
}

let s

it("should recover broken json", cb => {
  fs({
    "/json/peers": new Buffer("@¥¤€Ł"),
    "/json/peers.bak": jbuf(testdata)
  })
  s = new store("/")
  s.start(err => {
    if (err) return cb(err)

    s.json.read("peers", (err, res) => {
      if (err) return cb(err)
      assert(res, "no result")
      assert(JSON.stringify(res) == JSON.stringify(testdata), "not matching")
      return cb()
    })
  })
})

it("should write and read", cb => {
  fs({})
  s = new store("/")
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

it("should read", cb => {
  fs({
    "/json/test": jbuf(testdata)
  })
  s = new store("/")
  s.start(err => {
    if (err) return cb(err)

    s.json.read("test", (err, data) => {
      if (err) return cb(err)
      assert(data, "no result")
      assert.deepEqual(data, testdata, "wrong data")
      return cb()
    })
  })
})

afterEach(cb => {
  fs.restore()
  s.stop(cb)
})
