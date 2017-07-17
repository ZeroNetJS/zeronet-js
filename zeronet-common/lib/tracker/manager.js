"use strict"

const each = require("async/each")

module.exports = function TrackerManager(zeronet) {
  const self = this

  let trackers = []

  let lastid

  function updateNext() {
    if (!trackers.length) return
    if (lastid >= trackers.length) return (lastid = 0)
    trackers[lastid].update()
    lastid++
  }

  function updateAll() {
    updateNext()
    if (lastid) setTimeout(updateAll, 1000)
  }

  const main = setInterval(() => {
    lastid = 0
    updateAll()
  }, (30 + trackers.length) * 1000) //every 30secs + per tracker 1sec

  function add(tracker, zite) {
    let plist

    tracker.on("peer", (addr) => {
      if (!plist) { //add async as the tracker client yields many peers sync
        plist = []
        process.nextTick(() => {
          zeronet.pool.addMany(plist, zite)
          plist = null
        })
      }
      plist.push(addr)
    })

    //tracker.on("update", console.log)

    tracker.complete()
    tracker.start()
    tracker.update()

    trackers.push(tracker)
  }

  function stop() {
    clearInterval(main)
    each(trackers, (tracker, next) => {
      tracker.once("error", next)
      tracker.once("stop", next)
      tracker.stop()
    })
  }

  self.add = add
  self.stop = stop
}
