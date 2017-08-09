"use strict"

const path = require("path")
require("app-module-path").addPath(path.join(__dirname, ".."))

const PeerId = require("peer-id")

//const sinon = require("sinon")
//const chai = require("chai")
//chai.use(require("sinon-chai"))
//chai.should()
//const expect = chai.expect
const assert = require("assert")

//global.sinon = sinon
//global.expect = expect
global.assert = assert
//global.chai = chai

before(function (cb) {
  PeerId.createFromJSON({
    "id": "QmRQuY14GoeyDx5DoFWq9xnCteSz6pWFKcopvJspei5LXa",
    "privKey": "CAASqQkwggSlAgEAAoIBAQDXW+yHJxrvsOVh6EqNowW0CNMZLvDX8Ai+Sy3zDf8LmgOtZaGvQW/5A07peETcYf/pBCw8p2eqZwzouVxXbPteYnGbLX5AV8edzb98PDIRFAb7tInRbzWcaIC6Bwh5hjiUC4smf2ZEuZl0St9zDGYFGYEPam6HSvIph1RfDPbMXU6X+AIqMXKiArc5K43BpEblNht432xR9ywDQUkJuoXM1NkERCjsE0VkO29MZ2IFM9yUp02JqGKNeubgwOsbfmbXsg715aiWoTiT6lTBJ5bgtydE56YO5jaKVuHsQw9u/QoqdygK6N9mK9vK/KANuveLOpQI9tXchHYwV1aY7VdFAgMBAAECggEBAKMTDoZBDFqYHvoGhf2+hmEPlZoqO2God1ZxYzf7Tzefxk0U+lvVN07ePHD6C1q+MqRl7oF3Wj5kjhfj1JK3CZks/k29Iy7hyVwrImaWxmq8OZV73ihjB7uKPn+fN8Gd61Xfb90U94Hu8M5oq89YgiA2cc4Uj+GO1NSxjyfyjyer0z/nOkQRCFgwh5NKxm8rxWHfDdwn3ftjwZglx9cRj3pwZ6g04Cga7HiQMEgZ3LRmwRVHKancqkqfT5woTgzR+8SpGJ4wu+8QVBcHPUWj91Rmt3jm3cLdH4/BBAIIY1RE23k6srWJw7axZOLOJKwgRJDM+qHr4LkYTAn89CoTggECgYEA/s2HqUK9O3S8+0Gf9oUM61GPQBqo8mzEjkeiXF1n2pKr+M0xavtCwj2fWrShpOiIKdXUyM3ANJya+aBDQ4/FPvOjFDGSR0ToQttcWdM+noXq+x6C4yiN/8U533mUKhlG+XzosH7PIaASDVLgKUV57GmbUIEuMEXHruhTHoh+OUECgYEA2F7zvFBPnk+yQGDkYbtrT5RpuqK9qU55ujLO2QuleL7Jm0hvK+/z3cTpuR6Lfn7nPcTl27vCxMLSJvLC/sBEuTcY02u+7PvclD9iBGVdvsXL9NoWBw5xYBXyBOXnQGQKcLhWSlDI4REHWezlcfkZ3Zicx8AqHB4nxaEMbkFG+QUCgYEAnkIHzaBPKluSeThEY3g2Ev6AS9+DKbdWycxCUr4NIBvTRmAkHn9a8owVqt/gOi3XTKysUeBBTiwqsXrR7GeiqjvnAUbcxPlOjR/0FzJ2hT1GOpyzzOVGdSMJk/zOgutaQuFLITxR6F+kdrQP2HJ3jNf3CKSDjKX6pW9VGPTL+UECgYEAg/HbVoHvG45kGAg+HS8qcHwDwbGOURmu95IWO5tzi99kmBIi4TtRjnKPSLlMvZXrs+pHdajZTB22A9RUfv+GqR/lPsBczK2GRM0mG6Io+bYq+ySm/CSdlMetL7l3PPgEudpfnLAI397/iaICBW+vi0eOi+0ugLkO7eCY8P9TpXUCgYAC87u6cHeNecWIjBEsZHoadOYXZTpQIZsVE2c1apcMFp8+xu89Jl4TM4iHYzuzpBuW9q/X7ZYAE35zUpR1iOE1YbWH3nXYj1JCYTuhFS+7acJ4bNfs7qy6AKCbqiw2fv9SNpY0gMn8Y/vLx6FQdzxU2AE8URANgSTA8pA9DaqVEQ==",
    "pubKey": "CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDXW+yHJxrvsOVh6EqNowW0CNMZLvDX8Ai+Sy3zDf8LmgOtZaGvQW/5A07peETcYf/pBCw8p2eqZwzouVxXbPteYnGbLX5AV8edzb98PDIRFAb7tInRbzWcaIC6Bwh5hjiUC4smf2ZEuZl0St9zDGYFGYEPam6HSvIph1RfDPbMXU6X+AIqMXKiArc5K43BpEblNht432xR9ywDQUkJuoXM1NkERCjsE0VkO29MZ2IFM9yUp02JqGKNeubgwOsbfmbXsg715aiWoTiT6lTBJ5bgtydE56YO5jaKVuHsQw9u/QoqdygK6N9mK9vK/KANuveLOpQI9tXchHYwV1aY7VdFAgMBAAE="
  }, (e, id) => {
    if (e) return cb(e)
    global.id = id
    cb()
  })
})

const fs = require("fs")
const files = fs.readdirSync(__dirname + "/").filter(file => fs.lstatSync(__dirname + "/" + file).isDirectory()).sort()

describe("zeronet python interop", function () {
  files.forEach(file => {
    describe(file, function () {
      fs.readdirSync(__dirname + "/" + file).sort().forEach(function (file2) {
        if (file2.endsWith(".js")) require(__dirname + "/" + file + "/" + file2)
      })
    })
  })
})
