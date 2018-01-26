'use strict'

// Offical ZeroNetJS trackers, bootstrap servers, relays, etc.
module.exports = {
  wstar: [
    '/dnsaddr/ws-star-signal-1.servep2p.com/tcp/443/wss/p2p-websocket-star',
    '/dnsaddr/ws-star-signal-2.servep2p.com/tcp/443/wss/p2p-websocket-star',
    '/dnsaddr/ws-star-signal-3.servep2p.com/tcp/443/wss/p2p-websocket-star',
    '/dnsaddr/ws-star-signal-4.servep2p.com/tcp/443/wss/p2p-websocket-star',
    '/dnsaddr/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
    '/dns4/localhost/tcp/80/ws/p2p-websocket-star'
  ],
  bootstrap_libp2p: [

  ],
  relay: [
    '/dnsaddr/znjs-relay.servep2p.com/tcp/443/wss/p2p-znjs-relay/ipfs/QmVdTP7ve4AhrYMzQALEtbXojAYsZAMXTTwyJq8w46CosQ'
  ],
  trackers: [ // taken from here https://github.com/HelloZeroNet/ZeroNet/blob/master/src/Config.py#L35-L44
    // "zero://boot3rdez4rzn36x.onion:15441", TODO: tor
    // "zero://zero.booth.moe#f36ca555bee6ba216b14d10f38c16f7769ff064e0e37d887603548cc2e64191d:15441", TODO: figure out what the hashtag means
    // "zero://216.189.144.82:15441", TODO: https://github.com/ZeroNetJS/zeronet-tracker/issues/4
    'udp://tracker.coppersurfer.tk:6969',
    'udp://tracker.leechers-paradise.org:6969',
    'udp://9.rarbg.com:2710',
    'http://tracker.opentrackr.org:1337/announce',
    'http://explodie.org:6969/announce',
    'http://retracker.spark-rostov.ru:80/announce'
    // "http://localhost:25534/announce" // DEV ONLY
  ]
}
