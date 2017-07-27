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

// Solves the intersection for a single component
// Reference: http://stackoverflow.com/questions/2821506/how-do-you-tell-if-two-wildcards-overlap
function innersect(w1, w2) {
  // both are either empty or contain a wildcard
  if ((w1 === "" || w1 === "*") &&
    (w2 === "" || w2 === "*")) return true;
  // only one of them is empty, the other is not just a wildcard
  if (w1 === "" || w2 === "") return false;
  var c1 = w1[0], c2 = w2[0];
  var remain1 = w1.slice(1), remain2 = w2.slice(1);
  // if first letters match and remaining innersect
  if (c1 === c2 && innersect(remain1, remain2)) return true;
  // if either is a wildcard and either remaining innersects with the other whole
  if ((c1 === '*' || c2 === '*')
    && (innersect(w1, remain2) || innersect(remain1, w2)))
    return true;
  // else, no match, return false
  return false;
}

// Solves the intersection for paths (arrays of components)
// and double-kleenes
function outersect(w1, w2) {
  // both are either empty or contain a double-kleene
  if ((w1.length === 0 || w1 === "**") && (w2.length === 0 || w2 === "**")) return true;
  // one of them is empty, the other one is non-empty, not double-kleene
  if (w1.length === 0 || w2.length === 0) return false;
  var c1 = w1[0], c2 = w2[0];
  var remain1 = w1.slice(1), remain2 = w2.slice(1);
  // if first items innersect and remaining outersect
  if (innersect(c1, c2) && outersect(remain1, remain2)) return true;
  // if either is a wildcard and either remaining outersects with the other
  if ((c1 === '**' || c2 === '**')
    && (outersect(w1, remain2) || outersect(remain1, w2)))
    return true;
  // else, no match, return false
  return false;
}

function prepareWildPath(path) {

  //strips out duplicate sequential wildcards, ie simon***bishop -> simon*bishop

  if (!path) return '';

  var prepared = '';

  var lastChar = null;

  var currentChar = null;

  for (var i = 0; i < path.length; i++) {
    currentChar = path[i];

    if (currentChar == '*' && lastChar == '*') continue;
    prepared += currentChar;
  }

  return prepared;
};

function conventionalMatch(pattern, path) {

  return makeRe(pattern, true).test(path);
};

function internalMatch(path1, path2) {

  path1 = prepareWildPath(path1);

  path2 = prepareWildPath(path2);

  if (path1 == path2) return true;//equal to each other

  var path1WildcardIndex = path1.indexOf('*');

  var path2WildcardIndex = path2.indexOf('*');

  //one is * or ** or *** etc
  if (path1 == '*' || path2 == '*') return true;//one is anything

  //precise match, no wildcards
  if (path1WildcardIndex == -1 && path2WildcardIndex == -1) return path1 == path2;

  //if we only have a wildcard on one side, use conventional means
  if (path1WildcardIndex == -1) return conventionalMatch(path2, path1);

  if (path2WildcardIndex == -1) return conventionalMatch(path1, path2);

  //biggest path is our x-axis
  var vertical = (path1.length >= path2.length ? path1 : path2).split('');

  //smallest path is our y-axis
  var horizontal = (path1.length < path2.length ? path1 : path2).split('');

  var matrix = [];

  // console.log(long.split('').join(' '));
  // console.log(short.split('').join(' '));

  vertical.forEach(function (verticalChar) {

    horizontal.forEach(function (horizontalChar, horizontalIndex) {

      if (!matrix[horizontalIndex]) matrix[horizontalIndex] = [];

      if (horizontalChar == verticalChar || horizontalChar == '*' || verticalChar == '*')
        matrix[horizontalIndex].push(horizontalChar);

      else  matrix[horizontalIndex].push(0);
    });
  });

  //console.log(matrix[0].join(' '));

  // matrix.forEach(function (horizontal) {
  //   console.log(horizontal.join(' '));
  // });

  //console.log('given header:::', matrix[0].join(' '));

  var matched = false;

  for (var i = 0; i < matrix[0].length; i++) {

    if (matrix[0][i] != 0) {
      // console.log('with x:' + i + ' equal to: ' + matrix[0][i]);
      // console.log('we loop through x and y adding 1 each time');
      var x = i;

      var total = 1;

      for (var y = 1; y < horizontal.length; y++) {

        x++;

        var intersection = matrix[y][x];
        if (!intersection) {
          if (y - 1 != 0 && matrix[y - 1][x - 1] == '*') {

            var foundShift = -1;

            for (var xShiftForward = x + 1; xShiftForward < matrix[0].length; xShiftForward++) {
              if (matrix[y][xShiftForward]) {
                foundShift = xShiftForward;
                break;
              }
            }

            if (foundShift == -1)
              for (var xShiftBackward = x - 1; xShiftBackward >= 0; xShiftBackward--) {
                if (matrix[y][xShiftBackward]) {
                  foundShift = xShiftBackward;
                  break;
                }
              }

            if (foundShift > -1) {
              x = foundShift;
            } else break;

          } else break;
        }

        total++;
        // console.log('we have x + 1 and y + 1 equal to: ', x, y, 'respectively');
        // console.log('this equals on our matrix: ', matrix[y][x]);
        //console.log('total is: ', total, ' out of ', horizontal.length);

        if (total == horizontal.length) {
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }

  return matched;
};

// Usable export.
function intersect(w1, w2) {
  return outersect(w1.split('/'), w2.split('/'));
}

module.exports.intersect = intersect;

module.exports.matches = function (input, pattern) {
  return internalMatch(input, pattern);
};
