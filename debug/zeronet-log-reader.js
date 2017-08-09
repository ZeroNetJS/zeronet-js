"use strict"

const fs = require("fs")
const file = process.argv[2]
const read = fs.createReadStream(file)
let data = []
const readline = require("readline")
const rl = readline.createInterface({
  input: read
})

if (!process.env.DEBUG) process.env.DEBUG = "*"

const cp = require("child_process")

const bunyan = cp.spawn(process.argv[0], [__dirname + "/../node_modules/.bin/bunyan"], {
  stdio: ["pipe", process.stderr, process.stderr]
})

const clogger = {
  "bunyan": () => bunyan,
  "debug": require("debug"),
  "console": t => console[t].bind(console)
}

const assert = require("assert")
//console.log("reading")
rl.on("line", line => {
  data.push(line)
})
read.on("end", () => {
  //console.log("parsing")
  data = data.map(line => {
    try {
      const r = JSON.parse(line)
      assert.equal(typeof r, "object")
      if (typeof r.time == "string")
        r.time = new Date(r.time).getTime()
      return r
    } catch (e) {
      return line
    }
  })
  //console.log("sorting")
  data = data.sort((a, b) => {
    if (a.time && b.time)
      return a.time - b.time
    return 0
  })

  let dlogs = {
    bunyan: {},
    debug: {},
    console: {}
  }

  let skip = 0

  if (process.env.SKIP) skip = parseInt(process.env.SKIP, 10)

  const starttime = data.reduce((a, b) => typeof a == "object" ? a : b, 0).time
  data = data.map(d => {
    if (typeof d == "string") {
      return {
        type: "string",
        data: d,
        time: 0
      }
    }
    let r = {}
    if (!d.name) d.name = d.type
    r.time = d.time - (starttime + skip)
    r.data = d
    if (d.debug) r.type = "debug"
    else if (d.console) r.type = "console"
    else r.type = "bunyan"
    if (!dlogs[r.type][d.name]) dlogs[r.type][d.name] = clogger[r.type](d.name)
    return r
  })

  //console.log("printing")

  if (process.env.FF) data = data.map(d => {
    d.time = d.time / 100
    return d
  })

  if (process.env.SLOW) data = data.map(d => {
    d.time = d.time * 10
    return d
  })

  data.map(d => {
    switch (d.type) {
    case "string":
      setTimeout(() => console.log(d.data), d.time)
      break;
    case "debug":
      setTimeout(() => dlogs.debug[d.data.name].apply(dlogs.debug[d.data.name], d.data.data), d.time)
      break;
    case "bunyan":
      d.data.time = new Date(d.data.time)
      setTimeout(() => dlogs.bunyan[d.data.name].stdin.write(JSON.stringify(d.data) + "\n"), d.time)
      break;
    case "console":
      setTimeout(() => dlogs.console[d.data.type].apply(dlogs.console[d.data.type], d.data.data), d.time)
      break;
    }
  })
})
