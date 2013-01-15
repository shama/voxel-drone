//var Buffer = require('buffer').Buffer;
var util = require('util');

// parse ar drone commands
module.exports = function(raw) {
  var cmds = String(raw).split('\r');
  var out = [];
  cmds.forEach(function(cmd) {
    if (cmd.length < 1) return;
    var data = cmd.slice(cmd.indexOf('=')+1).split(',');
    out.push({
      type: cmd.slice(3, cmd.indexOf('=')),
      number: data.slice(0, 1)[0],
      //args: int32Float(data.slice(1))
      args: parseArgs(data.slice(1))
    });
  });
  return out;
};

function parseArgs(arg) {
  if (util.isArray(arg)) return arg.map(parseArgs);
  if (arg.indexOf('"') !== -1) return String(arg).replace(/\"/g, '');
  return int32Float(arg);
}

// convert int32 to floats
// not really, it should but doesnt work on the browser
function int32Float(num) {
  if (util.isArray(num)) return num.map(int32Float);
  return Number(num);
  /*
  // buffer-browserify returns NaN with this for some reason
  var buf = new Buffer(4);
  buf.writeInt32BE(Number(num || 0), 0);
  return buf.readFloatLE(0);
  */
}
module.exports.int32Float = int32Float;
