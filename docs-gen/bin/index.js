const gen=require("../lib")
gen(process.argv[2],[process.argv[2]+"/lib/**/*.js"],{}, (err,res) => {
  if (err) throw err
  console.log(res)
})
