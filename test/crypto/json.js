"use strict"

const samples = {
  multi_space: "lots       of       spaces",
  unicode: " ü ä ö ",
  complex: {
    hello: [
      "world",
      1, 2, 3,
      "test"
    ]
  },
  zero_hello: require("./zh.json"),
  object_with_arrays: {
    test: [
      "thats",
      1,
      "nice",
      " Array ~~"
    ],
    test2: [
      "other",
      "array"
    ]
  },
  null_type: [
    null,
    undefined
  ]
}

global.python.ex `
  import json
  def jsonTest(j):
    return json.dumps(json.loads(j), sort_keys=True)
`

const assert = require("assert")
const crypto = require("zeronet-crypto")
const cp = require("child_process")
const bl = require("bl")

describe("json", () => {
  for (let sample in samples) {
    it("should stringify the " + sample + " sample like python", done => {
      const s = samples[sample]
      const p = cp.spawn("python2", [__dirname + "/json_convert.py"], {
        stdio: ["pipe", "pipe", "inherit"]
      })
      p.stdin.write(JSON.stringify(s))
      p.stdin.end()
      p.stdout.pipe(bl((err, data) => {
        if (err) return done(err)
        assert.equal(crypto.PythonJSONDump(s), data.toString(), "not matching zn-py-dump")
        done()
      }))
      p.once("exit", (e, s) => e || s ? done(new Error("Python exited with " + e || s)) : false)
    })
  }
})
