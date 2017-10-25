/*
Taken gratefully from MCollina's hyperid: https://github.com/mcollina/hyperid
 */

var uuid = require('uuid');
var maxInt = Math.pow(2, 31) - 1;

function hyperid() {

  var count = 0

  generate.uuid = uuid.v4();
  var id = baseId(generate.uuid, false);

  function generate() {
    var result = id + count++;

    if (count === maxInt) {
      generate.uuid = uuid.v4();
      id = baseId(generate.uuid, false); // rebase
      count = 0
    }

    return result;
  }

  generate.decode = decode;

  return generate;
}

function baseId(id) {

  var base64Id = new Buffer(uuid.parse(id)).toString('base64');

  return base64Id.replace(/==$/, '/');
}

function decode(id) {

  var a = id.match(/(.*)+\/(\d+)+$/);

  if (!a) return null;

  var result = {
    uuid: uuid.unparse(new Buffer(a[1] + '==', 'base64')),
    count: parseInt(a[2])
  };

  return result;
}

module.exports = hyperid;
module.exports.decode = decode;
