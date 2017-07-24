var escapeStringRegexp = require('./escape-string-regexp');

if (!global.Map) global.Map = require('es6-map');

var reCache = new Map();

function makeRe(pattern) {

  if (reCache.has(pattern)) return reCache.get(pattern);

  pattern = escapeStringRegexp(pattern).replace(/\\\*/g, '.*');

  var re = new RegExp('^' + pattern + '$', 'i');

  reCache.set(pattern, re);

  return re;
}

module.exports.isMatch = function(input, pattern) {
  return makeRe(pattern, true).test(input);
};
