'use strict'

const debug = require('debug')
const log = debug('zeronet:sentry')

if (process.env.DISABLE_SENTRY || global.DISABLE_SENTRY) return log('sentry disabled by user')

const setup = () => {
  const Raven = require('raven')
  Raven.config('https://f2a666530dc342d3994e3a91aa7ea903:44e81d0ef80f43c498d52cd7f667a900@sentry.zion.host/5').install()
}

if (process.env.SNAP && !process.env.SNAP_REVISION.startsWith('x')) { // detect snap production
  log('setting up sentry for snap')
  setup()
} else if (typeof window === 'object' && window.location.host == 'zeronetjs.github.io') { // detect web production
  log('setting up sentry for web')
  const Raven = require('raven-js') // raven-js is for web
  Raven.config('https://f2a666530dc342d3994e3a91aa7ea903@sentry.zion.host/5').install()
} else if (process.argv[1].matches(/^\/usr.*\/bin\/zeronet$/) && __dirname.matches(/^\/usr\/.*\/node_modules\/.+$/)) {
  log('setting up sentry for nodejs-cli')
  setup()
} else {
  log('sentry not enabled: no valid env detected')
}
// TODO: detect nodejs production (used as cli)
// TODO: detect pkg
