//Document all the things
const fs = require("fs")
const gen = require("../lib")
const todo = []
const fix = {
  "zeronet-client": true,
  "zeronet-crypto": true,
  "zeronet-fileserver": true,
  "zeronet-swarm": true
}
fs.readdirSync(".")
  .filter(s => !!s.match(/^zeronet-[a-z]+$/))
  .map(s => todo.push([s, s + (fix[s] ? "/*.js" : "/lib/**/*.js"), s + "/DOCS.md"]))

function next() {
  const i = todo.shift()
  if (!i) process.exit(console.log("DONE"))
  try {
    gen(i[0], i[1], {}, (err, res) => {
      if (err) {
        console.error("FAILED TO GENERATE DOCS FOR %s", i[0])
        console.error(err)
      } else {
        console.log("%s ok", i[0])
        fs.writeFileSync(i[2], new Buffer(res))
      }
      next()
    })
  } catch (err) {
    console.error("FAILED TO GENERATE DOCS FOR %s", i[0])
    console.error(err)
    next()
  }
}

next()
