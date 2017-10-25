module.exports = PareTree;

var LRU = require("lru-cache");
var BinarySearchTree = require('binary-search-tree').BinarySearchTree;
var hyperid = require('./lib/id');
var uniqid = new hyperid();
var sift = require('sift');
var SortedObjectArray = require("./lib/sorted-array");
var Comedian = require('co-median');

PareTree.prototype.add = add;
PareTree.prototype.search = search;
PareTree.prototype.remove = remove;

PareTree.prototype.__initialize = __initialize;
PareTree.prototype.__getTrunk = __getTrunk;
PareTree.prototype.__addAll = __addAll;
PareTree.prototype.__releaseId = __releaseId;
PareTree.prototype.__decodeId = __decodeId;
PareTree.prototype.__createId = __createId;
PareTree.prototype.__getUpperBound = __getUpperBound;
PareTree.prototype.__getLowerBound = __getLowerBound;
PareTree.prototype.__updateBounds = __updateBounds;
PareTree.prototype.__addSubscription = __addSubscription;
PareTree.prototype.__configureWildcardSegment = __configureWildcardSegment;
PareTree.prototype.__segmentPath = __segmentPath;
PareTree.prototype.__removeAllSubscriptionEntry = __removeAllSubscriptionEntry;
PareTree.prototype.__pruneAll = __pruneAll;
PareTree.prototype.__prune = __prune;
PareTree.prototype.__removeWildcardSubscriptionEntry = __removeWildcardSubscriptionEntry;
PareTree.prototype.__removeSpecific = __removeSpecific;
PareTree.prototype.__removeByPath = __removeByPath;
PareTree.prototype.__wildcardMatch = __wildcardMatch;
PareTree.prototype.__decouple = __decouple;
PareTree.prototype.__appendQueryRecipient = __appendQueryRecipient;
PareTree.prototype.__appendRecipients = __appendRecipients;
PareTree.prototype.__iterateAllBranches = __iterateAllBranches;
PareTree.prototype.__iterateAll = __iterateAll;
PareTree.prototype.__iteratePrecise = __iteratePrecise;
PareTree.prototype.__permutate = __permutate;
PareTree.prototype.__iterateBranches = __iterateBranches;
PareTree.prototype.__iterateWildcard = __iterateWildcard;
PareTree.prototype.__iterateWildcardSearch = __iterateWildcardSearch;
PareTree.prototype.__endsWith = __endsWith;
PareTree.prototype.__handleMatch = __handleMatch;
PareTree.prototype.__wildcardSearchAndAppend = __wildcardSearchAndAppend;
PareTree.prototype.__searchAndAppend = __searchAndAppend;


function PareTree(options) {
  this.options = options ? options : {};

  if (!this.options.cache) this.options.cache = {
    max: 10000
  };

  if (!this.options.wildcardCache) this.options.wildcardCache = {
    cache: 1000
  };

  this.__cache = new LRU(this.options.cache);

  this.__initialize();
}


PareTree.prototype.SEGMENT_TYPE = {
  ALL: -1,
  PRECISE: 0,
  WILDCARD_LEFT: 1,
  WILDCARD_RIGHT: 2,
  WILDCARD_COMPLEX: 3,
  WILDCARD: 4
};


function add(path, recipient) {
  if (recipient == null) throw new Error('no recipient for subscription');

  if (recipient.substring) recipient = {
    key: recipient
  };

  var pathInfo = this.__segmentPath(path);

  if (pathInfo.type === this.SEGMENT_TYPE.ALL) return this.__addAll(pathInfo, recipient);

  else return this.__addSubscription(pathInfo, recipient);
};


function search(path, options) {
  //[start:{"key":"search"}:start]

  if (path == null || (path.replace && path.replace('*', '') == '')) path = '*';

  if (options == null) options = {};

  if (path.path) {
    options = path;
    path = path.path
  }

  //cache key is comprised of the path, and the options stringified,
  // so we dont cache something that has been filtered and then
  // do a search without a filter and get the filtered data

  var cacheKey = path + JSON.stringify(options);

  var subscriptions = this.__cache.get(cacheKey);

  if (subscriptions != null) return subscriptions;

  else subscriptions = [];

  var searchPath = this.__segmentPath(path);

  if ([this.SEGMENT_TYPE.WILDCARD_LEFT,
      this.SEGMENT_TYPE.WILDCARD_RIGHT,
      this.SEGMENT_TYPE.WILDCARD_COMPLEX
    ].indexOf(searchPath.type) > -1)
    this.__wildcardSearchAndAppend(searchPath, subscriptions, options ? options.excludeAll : false);
  else
    this.__searchAndAppend(searchPath, subscriptions, options ? options.excludeAll : false);

  if (options.filter != null) subscriptions = sift(options.filter, subscriptions);

  if (options.decouple) subscriptions = this.__decouple(subscriptions);

  this.__cache.set(cacheKey, subscriptions);

  //[end:{"key":"search"}:end]

  return subscriptions;
};


function remove(options) {
  var removed = [];

  if (!options || options.substring) removed = this.__removeByPath({
    path: options
  });

  else if (options.id) {

    var specific = this.__removeSpecific(options);
    if (specific != null) removed = [specific];
  } else if (options.path) removed = this.__removeByPath(options);

  else throw new Error('invalid remove options: ' + JSON.stringify(options));

  return removed;
};


function __initialize() {
  this.__cache.reset();

  this.__trunkWildcardLeft = new BinarySearchTree();

  this.__trunkWildcardRight = new BinarySearchTree();

  this.__trunkComplex = new BinarySearchTree();

  this.__trunkPrecise = new BinarySearchTree();

  this.__allBranches = {};

  this.__trunkAll = {
    recipients: {}
  };

  this.__counts = {};

  this.__upperBounds = {};

  this.__lowerBounds = {};

  this.__comedian = new Comedian(this.options.wildcardCache);
};


function __getTrunk(pathInfo) {
  if (pathInfo.type === this.SEGMENT_TYPE.ALL) return this.__trunkAll;

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_COMPLEX) return this.__trunkComplex;

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_LEFT) {
    return this.__trunkWildcardLeft;
  }
  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_RIGHT) return this.__trunkWildcardRight;

  return this.__trunkPrecise;
};


function __addAll(pathInfo, recipient) {
  var existingRecipient = this.__trunkAll.recipients[recipient.key];

  if (existingRecipient == null) {

    existingRecipient = {
      refCount: 0,
      segment: pathInfo.path.length,
      path: pathInfo.path,
      key: recipient.key,
      subscriptions: []
    };

    this.__trunkAll.recipients[recipient.key] = existingRecipient;
  }

  existingRecipient.refCount += (recipient.refCount ? recipient.refCount : 1);

  var subscriptionId = this.__createId(recipient.key, this.SEGMENT_TYPE.ALL, pathInfo.path);

  existingRecipient.subscriptions.push({
    id: subscriptionId,
    data: recipient.data,
    path: pathInfo.path
  });

  return {
    id: subscriptionId
  };
};


function __releaseId(id) {
  var subscriptionData = this.__decodeId(id);

  this.__updateBounds(subscriptionData.type, -1, subscriptionData.path);
};


function __decodeId(id) {
  var sections = id.split('&');

  return {
    key: sections[0],
    type: parseInt(sections[1]),
    id: sections[2],
    path: sections.slice(3).join('')
  };
};


function __createId(recipientKey, subscriptionType, path) {
  var id = uniqid();

  this.__updateBounds(subscriptionType, 1, path);

  return recipientKey + '&' + subscriptionType + '&' + id + '&' + path;
};


function __getUpperBound(subscriptionType, trunk) {
  var highest = null;

  var currentLower = this.__lowerBounds[subscriptionType];
  var currentUpper = this.__upperBounds[subscriptionType];

  for (var i = currentUpper; i >= currentLower; i--) {
    highest = i;
    if (trunk.search(i)[0] != null) break;
  }

  return highest;
};


function __getLowerBound(subscriptionType, trunk) {
  var lowest = null;

  var currentLower = this.__lowerBounds[subscriptionType];
  var currentUpper = this.__upperBounds[subscriptionType];

  for (var i = currentLower; i <= currentUpper; i++) {
    lowest = i;
    if (trunk.search(i)[0] != null) break;
  }

  return lowest;
};


function __updateBounds(subscriptionType, count, path) {
  this.__cache.reset();

  if (count == null) count = 1;

  if (this.__counts[subscriptionType] == null) this.__counts[subscriptionType] = 0;

  this.__counts[subscriptionType] += count;

  //TODO - use these

  if (subscriptionType >= 0) {

    if (count > 0) {

      if (this.__upperBounds[subscriptionType] == null || path.length > this.__upperBounds[subscriptionType]) this.__upperBounds[subscriptionType] = path.length;
      if (this.__lowerBounds[subscriptionType] == null || path.length < this.__lowerBounds[subscriptionType]) this.__lowerBounds[subscriptionType] = path.length;

    } else {

      var trunk = this.__getTrunk({
        type: subscriptionType
      });

      if (this.__upperBounds[subscriptionType] === path.length) this.__upperBounds[subscriptionType] = this.__getUpperBound(subscriptionType, trunk);
      if (this.__lowerBounds[subscriptionType] === path.length) this.__lowerBounds[subscriptionType] = this.__getLowerBound(subscriptionType, trunk);
    }
  }
};


function __addSubscription(pathInfo, recipient) {
  var trunk = this.__getTrunk(pathInfo);

  var segment = trunk.search(pathInfo.segmentPath.length)[0];

  if (segment == null) {

    segment = {
      size: pathInfo.segmentPath.length,
      branches: new BinarySearchTree(),
      allBranches: [],
      branchCount: 0
    };

    trunk.insert(pathInfo.segmentPath.length, segment);
  }

  var branch = segment.branches.search(pathInfo.segmentPath)[0];

  if (branch == null) {

    branch = {
      recipients: {},
      path: pathInfo.segmentPath,
      size: pathInfo.segmentPath.length
    };

    if (!this.__allBranches[pathInfo.type]) this.__allBranches[pathInfo.type] = new SortedObjectArray('size');

    this.__allBranches[pathInfo.type].insert(branch);

    segment.branches.insert(pathInfo.segmentPath, branch);

    segment.branchCount++;
  }

  var existingRecipient = branch.recipients[recipient.key];

  if (!existingRecipient) {

    existingRecipient = {
      refCount: 0,
      segment: pathInfo.segmentPath.length,
      key: recipient.key,
      subscriptions: []
    };

    branch.recipients[recipient.key] = existingRecipient;
  }

  existingRecipient.refCount += (recipient.refCount == null || recipient.refCount == 0 ? 1 : recipient.refCount);

  var subscriptionId = this.__createId(recipient.key, pathInfo.type, pathInfo.segmentPath);

  //only the latest data is searchable
  existingRecipient.subscriptions.push({
    id: subscriptionId,
    data: recipient.data,
    path: pathInfo.path ? pathInfo.path : '*'
  });

  return {
    id: subscriptionId
  };
};


function __configureWildcardSegment(segment) {
  segment.segmentPath = "";
  segment.segmentIndex = 0;
  segment.type = this.SEGMENT_TYPE.WILDCARD_COMPLEX;

  for (var i = 0; i < segment.pathSegments.length; i++) {

    if (segment.pathSegments[i].length >= segment.segmentPath.length) {
      segment.segmentPath = segment.pathSegments[i];
      segment.segmentIndex = i;
    }
  }

  if (segment.pathSegments.length == 2) {
    if (segment.segmentIndex === 0 && segment.pathSegments[1] == '') segment.type = this.SEGMENT_TYPE.WILDCARD_RIGHT;
    if (segment.segmentIndex === 1 && segment.pathSegments[0] == '') segment.type = this.SEGMENT_TYPE.WILDCARD_LEFT;
  }
};


function __segmentPath(path) {
  var segment = {
    type: this.SEGMENT_TYPE.PRECISE,
    segmentPath: path,
    pathSegments: path.split('*'),
    pathLength: path.length,
    pathRightEnd: path.substring(path.length - 1, path.length),
    pathLeftEnd: path.substring(0, 1),
    wildcardIndex: path.indexOf('*'),
    path: path,
    complex: false
  };

  if (path.replace(/[*]/g, '') == '') segment.type = this.SEGMENT_TYPE.ALL;

  else {

    if (segment.wildcardIndex == -1) return segment; //a precise segment

    this.__configureWildcardSegment(segment);
  }

  return segment;
};


function __removeAllSubscriptionEntry(subscriptionData, subscriptionId) {
  var recipient = this.__trunkAll.recipients[subscriptionData.key];

  if (recipient == null) return null;

  var removed = null;

  var _this = this;

  recipient.subscriptions.every(function (subscription, subscriptionIndex) {

    if (subscription.id === subscriptionId) {

      recipient.subscriptions.splice(subscriptionIndex, 1);

      removed = {
        id: subscriptionId
      };

      recipient.refCount -= 1;

      _this.__pruneAll(recipient, subscriptionData);

      _this.__releaseId(subscriptionId);

      return false;

    } else return true;
  });

  return removed;
};


function __pruneAll(recipient, subscriptionData) {
  if (recipient.subscriptions.length == 0) delete this.__trunkAll.recipients[subscriptionData.key];
};


function __prune(trunk, segment, branch, recipient, subscriptionData) {
  if (recipient.subscriptions.length == 0) delete branch.recipients[subscriptionData.key];

  if (Object.keys(branch.recipients).length == 0) {

    segment.branches.delete(subscriptionData.path);

    segment.branchCount--;

    this.__allBranches[subscriptionData.type].remove(subscriptionData.path.length, {
      'path': {
        $eq: subscriptionData.path
      }
    });
  }

  if (segment.branchCount <= 0) trunk.delete(subscriptionData.path.length);
};


function __removeWildcardSubscriptionEntry(subscriptionData, trunk, subscriptionId) {
  var segment = trunk.search(subscriptionData.path.length)[0];

  if (segment == null) return null;

  var branch = segment.branches.search(subscriptionData.path)[0];

  if (branch == null) return null;

  var recipient = branch.recipients[subscriptionData.key];

  if (recipient == null) return null;

  if (recipient.subscriptions.length == 0) return null;

  var removed = null;

  var _this = this;

  recipient.subscriptions.every(function (subscription, subscriptionIndex) {

    if (subscription.id === subscriptionId) {

      recipient.subscriptions.splice(subscriptionIndex, 1);

      removed = {
        id: subscriptionId
      };

      recipient.refCount -= 1;

      _this.__prune(trunk, segment, branch, recipient, subscriptionData);

      _this.__releaseId(subscriptionId);

      return false;

    } else return true;
  });

  return removed;
};


function __removeSpecific(options) {
  var subscriptionData = this.__decodeId(options.id);

  if (subscriptionData == null) return null;

  var trunk = this.__getTrunk(subscriptionData);

  if (subscriptionData.type === this.SEGMENT_TYPE.ALL)
    return this.__removeAllSubscriptionEntry(subscriptionData, options.id);

  return this.__removeWildcardSubscriptionEntry(subscriptionData, trunk, options.id);
};


function __removeByPath(options) {
  var _this = this;

  var removed = [];

  //we exclude * subscriptions if we are removing by a disticnt path, ie: /a/distinct/path/*
  if (options.path.replace(/[*]/g, '') != '') options.excludeAll = true;

  //loop through them removing each specific one
  _this.search(options).forEach(function (subscriptionEntry) {

    var removedResult = _this.__removeSpecific({
      id: subscriptionEntry.id
    });

    if (removedResult != null) removed.push(removedResult);
  });

  return removed;
};


function __wildcardMatch(path1, path2) {
  return this.__comedian.matches(path1, path2);
};


function __decouple(results) {
  return results.map(function (result) {

    return JSON.parse(JSON.stringify(result));
  });
};


function __appendQueryRecipient(recipient, searchPath, appendTo, type, wildcard) {
  var _this = this;

  //[start:{"key":"__appendQueryRecipient"}:start]

  recipient.subscriptions.map(function (subscription) {

    if ((type === _this.SEGMENT_TYPE.WILDCARD_COMPLEX || wildcard == true) && !_this.__wildcardMatch(subscription.path, searchPath)) return;

    appendTo.push({
      key: recipient.key,
      data: subscription.data,
      id: subscription.id,
      path: subscription.path
    });
  });

  //[end:{"key":"__appendQueryRecipient"}:end]
};


function __appendRecipients(searchPath, branch, subscriptions, type, wildcard) {
  var _this = this;

  //[start:{"key":"__appendRecipients"}:start]

  Object.keys(branch.recipients).forEach(function (recipientKey) {

    var recipient = branch.recipients[recipientKey];

    _this.__appendQueryRecipient(recipient, searchPath.path, subscriptions, type, wildcard);
  });

  //[end:{"key":"__appendRecipients"}:end]
};


function __iterateAllBranches(searchPath, subscriptions, handler, type) {
  if (this.__allBranches[type])
    this.__allBranches[type].array(true).forEach(function (branch) {
      handler(searchPath, branch, subscriptions, type);
    });
};


function __iterateAll(searchPath, subscriptions, handler) {
  if (this.__counts[this.SEGMENT_TYPE.ALL] == 0) return;

  handler(searchPath, this.__trunkAll, subscriptions, this.SEGMENT_TYPE.ALL);
};


function __iteratePrecise(searchPath, subscriptions, handler) {
  if (this.__counts[this.SEGMENT_TYPE.PRECISE] == 0) return;

  var _this = this;

  if (searchPath.type === _this.SEGMENT_TYPE.ALL) {

    for (var i = _this.__lowerBounds[_this.SEGMENT_TYPE.PRECISE]; i <= _this.__upperBounds[_this.SEGMENT_TYPE.PRECISE]; i++) {

      _this.__trunkPrecise.search(i).forEach(function (segment) {

        Object.keys(segment.branches).forEach(function (branchPath) {

          handler(searchPath, segment.branches[branchPath], subscriptions, _this.SEGMENT_TYPE.PRECISE);
        });
      });
    }
    return;
  }

  _this.__trunkPrecise.search(searchPath.path.length).forEach(function (segment) {

    segment.branches.search(searchPath.path).forEach(function (branch) {
      handler(searchPath, branch, subscriptions, _this.SEGMENT_TYPE.PRECISE);
    });
  });
};


function __permutate(path, type) {
  var permutations = [];

  var permPath = path;

  if (this.__counts[type] == 0 || this.__counts[type] == null) {
    return []; //no possible permutations
  }

  if (type === this.SEGMENT_TYPE.WILDCARD_RIGHT) {

    permPath = path.substring(0, this.__upperBounds[type] + 1);

    for (var i = 0; i < permPath.length; i++) {

      permutations.push(permPath.substring(0, i));
    }
  }

  if (type === this.SEGMENT_TYPE.WILDCARD_LEFT) {

    permPath = path.substring(path.length - (this.__upperBounds[type]));

    for (var i = permPath.length; i > 0; i--) {
      permutations.push(permPath.substring(permPath.length - i));
    }
  }

  return permutations;
};


function __iterateBranches(path, subscriptions, handler, type, trunk) {
  trunk.search(path.length).forEach(function (segment) {

    segment.branches.search(path).forEach(function (branch) {

      handler(path, branch, subscriptions, type);
    });
  });
};


function __iterateWildcard(searchPath, subscriptions, handler) {
  var _this = this;

  _this.__permutate(searchPath.path, _this.SEGMENT_TYPE.WILDCARD_RIGHT).forEach(function (path) {
    _this.__iterateBranches(path, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_RIGHT, _this.__trunkWildcardRight);
  });

  _this.__permutate(searchPath.path, _this.SEGMENT_TYPE.WILDCARD_LEFT).forEach(function (path) {
    _this.__iterateBranches(path, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_LEFT, _this.__trunkWildcardLeft);
  });

  if (!_this.__allBranches[_this.SEGMENT_TYPE.WILDCARD_COMPLEX]) return;

  for (var i = 0; i <= searchPath.path.length; i++) {

    _this.__allBranches[_this.SEGMENT_TYPE.WILDCARD_COMPLEX].search(i).forEach(function (branch) {

      if (branch.path.length <= searchPath.path.length)
        handler(searchPath, branch, subscriptions, _this.SEGMENT_TYPE.WILDCARD_COMPLEX);
    });
  }
};


function __iterateWildcardSearch(searchPath, subscriptions, handler, type) {
  var _this = this;

  //[start:{"key":"__iterateWildcardSearch"}:start]

  if (!_this.__allBranches[type]) return;

  _this.__allBranches[type].array().forEach(function (branch) {

    //handler(searchPath, branch, subscriptions, type, true);
    _this.__handleMatch(searchPath, branch, subscriptions, handler);
  });

  //[end:{"key":"__iterateWildcardSearch"}:end]
};


function __endsWith(str1, str2) {
  if (str1 == null ||
    str2 == null ||
    str1.substring == null ||
    str2.substring == null ||
    str2.length > str1.length) return false;

  return str1.substring(str1.length - str2.length) == str2;
};


function __handleMatch(searchPath, branch, subscriptions, handler) {
  //[start:{"key":"__handleMatch"}:start]

  if (searchPath.type == this.SEGMENT_TYPE.WILDCARD_LEFT && this.__endsWith(branch.path, searchPath.segmentPath))
    return handler(searchPath, branch, subscriptions);

  if (searchPath.type == this.SEGMENT_TYPE.WILDCARD_RIGHT && branch.path.indexOf(searchPath.segmentPath) == 0)
    return handler(searchPath, branch, subscriptions);

  handler(searchPath, branch, subscriptions, this.SEGMENT_TYPE.WILDCARD_COMPLEX);

  //[end:{"key":"__handleMatch"}:end]
};


function __wildcardSearchAndAppend(searchPath, subscriptions, excludeAll) {
  var _this = this;

  //[start:{"key":"__wildcardSearchAndAppend"}:start]

  var handler = _this.__appendRecipients.bind(_this);

  _this.__iterateWildcardSearch(searchPath, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_LEFT);
  _this.__iterateWildcardSearch(searchPath, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_RIGHT);
  _this.__iterateWildcardSearch(searchPath, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_COMPLEX);
  _this.__iterateWildcardSearch(searchPath, subscriptions, handler, _this.SEGMENT_TYPE.PRECISE);

  //_this.__iterateWildcardSearchPrecise(searchPath, subscriptions, handler);

  if (!excludeAll) this.__iterateAll(searchPath, subscriptions, handler);

  //[end:{"key":"__wildcardSearchAndAppend"}:end]
};


function __searchAndAppend(searchPath, subscriptions, excludeAll) {
  var handler = this.__appendRecipients.bind(this);

  if (searchPath.path === '*') {

    this.__iterateAllBranches(searchPath, subscriptions, handler, this.SEGMENT_TYPE.WILDCARD_LEFT);

    this.__iterateAllBranches(searchPath, subscriptions, handler, this.SEGMENT_TYPE.WILDCARD_RIGHT);

    this.__iterateAllBranches(searchPath, subscriptions, handler, this.SEGMENT_TYPE.WILDCARD_COMPLEX);

    this.__iterateAllBranches(searchPath, subscriptions, handler, this.SEGMENT_TYPE.PRECISE);

  } else {

    this.__iteratePrecise(searchPath, subscriptions, handler);

    this.__iterateWildcard(searchPath, subscriptions, handler);
  }

  if (!excludeAll) this.__iterateAll(searchPath, subscriptions, handler);
};
