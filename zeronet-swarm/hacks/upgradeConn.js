module.exports = function upgradeConn(conn, muxed_conn) {
  muxed_conn.getObservedAddrs = conn.getObservedAddrs
  muxed_conn.getPeerInfo = conn.getPeerInfo
  muxed_conn.handshake = conn.handshake
  muxed_conn.handshakeOPT = conn.handshakeOPT
  muxed_conn.isLibp2p = conn.isLibp2p
  muxed_conn.isEmu = conn.isEmu
}
