module.exports = function Renderable() {
  const self = this
  let all = []
  self.addMany = function () {
    [...arguments].forEach(a => self.add(a))
  }
  self.add = (content, indent) => {
    if (content instanceof Renderable) content = content.getAll()
    if (typeof content != "string" && !Array.isArray(content)) return
    if (!Array.isArray(content)) content = [content]
    if (content.length && indent && all[all.length - 1]) self.addMany([""], content) //add empty line in between
    else if (!content.length && indent && all[all.length - 1]) self.add([""]) //add empty line in between
    else if (content.length && indent) self.add(content)
    else if (content.length) all = all.concat(content)
  }
  self.getAll = () => all
  self.toString = () => all.join("\n")
}
