"use strict"

//Document all the things
const fs = require("fs")
const gen = require("../lib")
const todo = [
  ["zeronet", "zeronet.js", "./README.md"]
]
require("colors")
const fix = require("./fix")
const read = f => fs.readFileSync(f).toString().split("\n")
let add
if (process.env.ONLY)
  add = process.env.ONLY.split(",")
else
  add = fs.readdirSync(".")
  .filter(s => !!s.match(/^zeronet-[a-z]+$/))

add.map(s => todo.push([s, s + (fix[s] ? "/*.js" : "/lib/**/*.js"), s + "/README.md"]))

let failed = []

function done() {
  if (!failed.length) process.exit(console.log("DONE".green.bold))
  const p = "\n  => "
  console.log("DOCS GEN FOR THE FOLLOWING MODULES FAILED: %s".red.bold, p + failed.join(p))
  process.exit(2)
}

function next() {
  const i = todo.shift()
  if (!i) return done()
  try {
    console.log(" => %s".blue.bold, i[0])
    gen(i[0], i[1], {
      footer: read(".github/FOOTER.md")
    }, (err, res) => {
      if (err) {
        console.error("FAILED TO GENERATE DOCS FOR %s".red.bold, i[0])
        console.error(err)
        failed.push(i[0])
      } else {
        console.log("   => OK %s".green.bold, i[0])
        let cut
        let r = read(i[2]).filter(l => {
          if (!cut)
            if (l == "# API" || l == "-----") cut = true
          return !cut
        })
        fs.writeFileSync(i[2], new Buffer(r.concat(res.split("\n")).join("\n")))
      }
      next()
    })
  } catch (err) {
    console.error("FAILED TO SAVE DOCS FOR %s", i[0])
    console.error(err)
    next()
  }
}

next()
