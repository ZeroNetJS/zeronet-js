const gen = require("../lib")
const fix = require("./fix")
gen(process.argv[2], [process.argv[2] + (fix[process.argv[2]] ? "/*.js" : "/lib/**/*.js")], {}, (err, res) => {
  if (err) throw err
  console.log(res)
})
