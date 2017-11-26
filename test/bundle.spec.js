/* eslint-env mocha */

'use strict'

const PeerId = require('peer-id')

let n
let id

before(cb => {
  PeerId.createFromJSON(require('./ids')[0], (err, _id) => {
    if (err) return cb(err)
    id = _id
    cb()
  })
})

it('should start as bundle', cb => {
  n = require('..')({
    id
  })
  n.start(cb)
}).timeout(20000)

it('should stop as bundle', cb => n.stop(cb))
