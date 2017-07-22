"use strict"

const each = require("async/each")
const Tracker = require("zeronet-common/lib/tracker")

module.exports = function TrackerManager(tracker_server, zeronet) {
  const self = this

  let trackers = []

  let lastid = -1

  function updateNext() {
    if (!trackers.length) return
    if (lastid >= trackers.length) return (lastid = 0)
    trackers[lastid].update()
    lastid++
  }

  let main

  function updateAll() {
    if (trackers[lastid]) {
      updateNext()
      main = setTimeout(updateAll, 1000)
    } else {
      lastid = 0
      main = setTimeout(updateAll, 30 * 1000)
    }
  }

  updateAll()

  function add(tracker, zite) {
    let plist

    tracker.on("peer", (addr) => {
      if (!plist) { //add async as the tracker client yields many peers sync
        plist = []
        process.nextTick(() => {
          zeronet.peerPool.addMany(plist, zite)
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

  function create(address) {
    add(new Tracker(address, tracker_server, zeronet.peer_id), address)
  }

  self.create = create
  self.add = add
  self.stop = stop
}
