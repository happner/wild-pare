module.exports = SortedArray;

var LRU = require("lru-cache");
var SortedObjectArray = require("sorted-object-array");
var sift = require('sift');

SortedArray.prototype.reset = reset;
SortedArray.prototype.insert = insert;
SortedArray.prototype.search = search;
SortedArray.prototype.remove = remove;
SortedArray.prototype.array = array;
SortedArray.prototype.__walkUp = __walkUp;
SortedArray.prototype.__walkDown = __walkDown;
SortedArray.prototype.__decouple = __decouple;
SortedArray.prototype.__removeByIndex = __removeByIndex;
SortedArray.prototype.__reverseSortByIndex = __reverseSortByIndex;


function SortedArray(opts) {
  if (typeof opts == 'string') opts = {
    propertyName: opts
  };

  if (!opts.propertyName) opts.propertyName = "id";

  if (!opts.cache) opts.cache = {
    max: 10000
  };

  this.__options = opts;

  this.reset();
}


function reset() {
  this.__sorted = new SortedObjectArray(this.__options.propertyName);
  this.__cache = new LRU(this.__options.cache);
  this.__cache.reset();
};


function insert(obj) {
  if (!obj.hasOwnProperty(this.__options.propertyName)) throw new Error('object without a ' + this.__options.propertyName + ' field, cannot be sorted');

  var result = this.__sorted.insert(obj);

  this.__cache.reset();

  return result;
};


function search(key, criteria, indexesOnly) {
  var cacheKey = key + (criteria != null ? JSON.stringify(criteria) : '') + (indexesOnly != null ? 'indexes' : '');

  var found = this.__cache.get(cacheKey);

  if (found == null) {

    found = [];

    var firstFoundIndex = this.__sorted.search(key);

    if (firstFoundIndex > -1) {

      var item = this.__sorted.array[firstFoundIndex];

      if (indexesOnly) item.____index = firstFoundIndex;

      found.push(item);

      this.__walkUp(firstFoundIndex, key, found, indexesOnly);

      this.__walkDown(firstFoundIndex, key, found, indexesOnly);
    }

    if (criteria) {
      found = sift(criteria, found);
    }

    if (indexesOnly) found = found.map(function (obj) {
      return obj.____index;
    });

    this.__cache.set(cacheKey, found);
  }

  return this.__decouple(found);
};


function remove(obj, criteria) {
  if (!obj) throw new Error('key or object must be passed in for remove');

  var key = ['string', 'number'].indexOf(typeof obj) > -1 ? obj : obj[this.__options.propertyName];

  var toRemove = this.search(key, criteria, true);

  var removed = [];

  if (toRemove.length > 0) {

    var _this = this;

    toRemove.sort(_this.__reverseSortByIndex.bind(_this)).forEach(function (removeIndex) {

      var removedItem = _this.__removeByIndex(removeIndex);
      if (removedItem) removed.push(removedItem);
    });
    this.__cache.reset();
  }

  return toRemove;
};


function array(decouple) {
  if (!decouple) return this.__sorted.array;
  else return this.__decouple(this.__sorted.array);
};


function __walkUp(startIndex, key, appendTo, includeIndex) {
  var index = startIndex;
  var foundKey = key;
  var item = this.__sorted.array[index];

  while (foundKey == key) {

    index--;
    item = this.__sorted.array[index];

    if (item) {

      foundKey = item[this.__options.propertyName];

      if (foundKey == key) {
        if (includeIndex) item.____index = index;
        appendTo.push(item);
      }

    } else foundKey = null;
  }
};


function __walkDown(startIndex, key, appendTo, includeIndex) {
  var index = startIndex;
  var foundKey = key;
  var item = this.__sorted.array[index];

  while (foundKey == key) {

    index++;
    item = this.__sorted.array[index];

    if (item) {

      foundKey = item[this.__options.propertyName];

      if (foundKey == key) {
        if (includeIndex) item.____index = index;
        appendTo.push(item);
      }

    } else foundKey = null;
  }
};


function __decouple(items) {
  return items.map(function (item) {
    var decoupled = JSON.parse(JSON.stringify(item));

    return decoupled;
  });
};


function __removeByIndex(index) {
  var objectAt = this.__sorted.array[index];

  if (objectAt) {

    this.__sorted.array.splice(index, 1);

    return objectAt;

  } else return null;
};


function __reverseSortByIndex(a, b) {
  if (a < b) return 1;
  if (a > b) return 0;

  return -1;
};
