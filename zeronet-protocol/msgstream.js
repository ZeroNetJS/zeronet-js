//Because the default "stream" isn't really a stream at all
const {
  Writable
} = require('stream')

const buffer = require('buffer')

const {
  unpack,
  pack
} = require("msgpack")

function MsgPackStream(stream) {

  const w = new Writable({
    // Listen for data from the underlying stream, consuming it and emitting
    // 'msg' events as we find whole messages.
    write(d, encoding, callback) {
      // Make sure that self.buf reflects the entirety of the unread stream
      // of bytes; it needs to be a single buffer
      if (self.buf) {
        var b = new buffer.Buffer(self.buf.length + d.length)
        self.buf.copy(b, 0, 0, self.buf.length)
        d.copy(b, self.buf.length, 0, d.length)

        self.buf = b
      } else {
        self.buf = d
      }

      // Consume messages from the stream, one by one
      while (self.buf && self.buf.length > 0) {
        var msg = unpack(self.buf)
        if (!msg) {
          break
        }

        self.emit('msg', msg)
        if (unpack.bytes_remaining > 0) {
          self.buf = self.buf.slice(
            self.buf.length - unpack.bytes_remaining,
            self.buf.length
          )
        } else {
          self.buf = null
        }
      }

      return callback()
    },
    writev(chunks, callback) {
      // ...
    }
  })

  const self = w

  // Buffer of incomplete stream data
  self.buf = null

  // Send a message down the stream
  //
  // Allows the caller to pass additional arguments, which are passed
  // faithfully down to the write() method of the underlying stream.
  self.send = function (m) {
    // Sigh, no arguments.slice() method
    var args = [pack(m)]
    for (i = 1; i < arguments.length; i++) {
      args.push(arguments[i])
    }

    return s.write.apply(s, args)
  }

  stream.pipe(w)

  return w
}

module.exports = MsgPackStream
