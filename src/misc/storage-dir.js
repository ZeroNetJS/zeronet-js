'use strict'

const os = require('os')
const path = require('path')

module.exports = function getStorageDir () {
  if (process.env.RUNINCWD) return path.join(process.cwd(), '.zeronet')
  let isroot
  switch (true) {
    case Boolean(process.platform.match(/^linux/)):
      isroot = !process.getuid()
      switch (true) {
        case Boolean(process.env.SNAP): // snap aka ubuntu core
          if (isroot) {
            return process.env.SNAP_COMMON
          } else {
            return process.env.SNAP_USER_COMMON
          }
        default:
          if (isroot) {
            return '/var/lib/zeronet'
          } else {
            return path.join(os.homedir(), '.zeronet')
          }
      }
    case Boolean(process.platform.match(/^win/)): // windows
      return path.join(process.env.APPDATA, 'ZeroNet')
    case Boolean(process.platform.match(/^darwin/)): // mac
      return path.join(os.homedir(), 'Library', 'Preferences', 'ZeroNet')
    default:
      throw new Error('Unsupported platform ' + process.platform + '! Please report this!')
  }
}
