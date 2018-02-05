'use strict'

const debug = require('debug')
const log = debug('zeronet:sentry')

if (process.env.DISABLE_SENTRY || global.DISABLE_SENTRY) return log('sentry disabled by user')

const setup = () => {
  const Raven = require('raven')
  Raven.config('https://5cb67f37a5804b97b8f432782ee18424:19bd0c2f9a1c4c9399f355cf3b4791fe@sentry.io/278611').install()
}

if (process.env.SNAP && !process.env.SNAP_REVISION.startsWith('x')) { // detect snap production
  log('setting up sentry for snap')
  setup()
} else if (typeof window === 'object' && window.location.host == 'zeronetjs.github.io') { // detect web production
  log('setting up sentry for web')
  const Raven = require('raven-js') // raven-js is for web
  Raven.config('https://5cb67f37a5804b97b8f432782ee18424@sentry.io/278611').install()
} else if (process.argv[1].matches(/^\/usr.*\/bin\/zeronet$/) && __dirname.matches(/^\/usr\/.*\/node_modules\/.+$/)) {
  log('setting up sentry for nodejs-cli')
  setup()
} else {
  log('sentry not enabled: no valid env detected')
}
// TODO: detect nodejs production (used as cli)
// TODO: detect pkg
