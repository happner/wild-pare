var LRU = require("lru-cache")
  , BinarySearchTree = require('binary-search-tree').BinarySearchTree
  , hyperid = require('./lib/id')//require('uniqid')
  , uniqid = new hyperid()
  , sift = require('sift')
  , SortedObjectArray = require("./lib/sorted-array")
  , wildcard = require('./lib/wildcard')
  ;

function PareTree(options) {

  this.options = options ? options : {};

  if (!this.options.cache) this.options.cache = {max: 10000};

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

PareTree.prototype.__initialize = function () {

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

  this.__analytics = {
    started: {},
    accumulated: {},
    duration: {},
    counters: {},
    averages: {}
  };
};

PareTree.prototype.__averageTimeStart = function (key) {

  this.__analytics.started[key] = Date.now();
};

PareTree.prototype.__averageTimeEnd = function (key) {

  if (!this.__analytics.counters[key]) this.__analytics.counters[key] = 0;

  if (!this.__analytics.accumulated[key]) this.__analytics.accumulated[key] = 0;

  this.__analytics.counters[key]++;

  this.__analytics.accumulated[key] += Date.now() - this.__analytics.started[key];

  this.__analytics.averages[key] = this.__analytics.accumulated[key] / this.__analytics.counters[key];
};

PareTree.prototype.__getTrunk = function (pathInfo) {

  if (pathInfo.type === this.SEGMENT_TYPE.ALL) return this.__trunkAll;

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_COMPLEX) return this.__trunkComplex;

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_LEFT) {
    return this.__trunkWildcardLeft;
  }
  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_RIGHT) return this.__trunkWildcardRight;

  return this.__trunkPrecise;
};

PareTree.prototype.__addAll = function (pathInfo, recipient) {

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

  existingRecipient.subscriptions.push({id: subscriptionId, data: recipient.data, path: pathInfo.path});

  return {id: subscriptionId};
};

PareTree.prototype.__releaseId = function (id) {

  var subscriptionData = this.__decodeId(id);

  this.__updateBounds(subscriptionData.type, -1, subscriptionData.path);
};

PareTree.prototype.__decodeId = function (id) {

  var sections = id.split('&');

  return {
    key: sections[0],
    type: parseInt(sections[1]),
    id: sections[2],
    path: sections.slice(3).join('')
  };
};

PareTree.prototype.__createId = function (recipientKey, subscriptionType, path) {

  var id = uniqid();

  this.__updateBounds(subscriptionType, 1, path);

  return recipientKey + '&' + subscriptionType + '&' + id + '&' + path;
};

PareTree.prototype.__getUpperBound = function (subscriptionType, trunk) {

  var highest = null;

  var currentLower = this.__lowerBounds[subscriptionType];
  var currentUpper = this.__upperBounds[subscriptionType];

  for (var i = currentUpper; i >= currentLower; i--) {
    highest = i;
    if (trunk.search(i)[0] != null) break;
  }

  return highest;
};

PareTree.prototype.__getLowerBound = function (subscriptionType, trunk) {

  var lowest = null;

  var currentLower = this.__lowerBounds[subscriptionType];
  var currentUpper = this.__upperBounds[subscriptionType];

  for (var i = currentLower; i <= currentUpper; i++) {
    lowest = i;
    if (trunk.search(i)[0] != null) break;
  }

  return lowest;
};

PareTree.prototype.__updateBounds = function (subscriptionType, count, path) {

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

      var trunk = this.__getTrunk({type: subscriptionType});

      if (this.__upperBounds[subscriptionType] === path.length) this.__upperBounds[subscriptionType] = this.__getUpperBound(subscriptionType, trunk);
      if (this.__lowerBounds[subscriptionType] === path.length) this.__lowerBounds[subscriptionType] = this.__getLowerBound(subscriptionType, trunk);
    }
  }
};

PareTree.prototype.__addSubscription = function (pathInfo, recipient) {

  //this.__averageTimeStart('this.__getTree'); //after trying to understand a flame graph I decided to do this, much simpler to understand...

  //this.__averageTimeEnd('this.__getTree');

  //this.__averageTimeStart('this.__getSegment');

  var trunk = this.__getTrunk(pathInfo);

  var segment = trunk.search(pathInfo.segmentPath.length)[0];

  //this.__averageTimeEnd('this.__getSegment');

  //this.__averageTimeStart('!existingSegment');

  if (segment == null) {

    segment = {
      size: pathInfo.segmentPath.length,
      branches: new BinarySearchTree(),
      allBranches: [],
      branchCount: 0
    };

    trunk.insert(pathInfo.segmentPath.length, segment);
  }

  //this.__averageTimeEnd('!existingSegment');

  //this.__averageTimeStart('subscriptionList.search(segment)');

  //simon simo sim si s n on mon imon simon imo im m

  var branch = segment.branches.search(pathInfo.segmentPath)[0];

  if (branch == null) {

    branch = {recipients: {}, path: pathInfo.segmentPath, size:pathInfo.segmentPath.length};

    if (!this.__allBranches[pathInfo.type]) this.__allBranches[pathInfo.type] = new SortedObjectArray('size');

    this.__allBranches[pathInfo.type].insert(branch);

    segment.branches.insert(pathInfo.segmentPath, branch);

    segment.branchCount++;
  }

  //this.__averageTimeEnd('subscriptionList.search(segment)');

  //this.__averageTimeStart('existingSubscription.recipients[recipient.key]');

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

  //this.__averageTimeEnd('existingSubscription.recipients[recipient.key]');

  //this.__averageTimeStart('this.__subscriptionId');

  var subscriptionId = this.__createId(recipient.key, pathInfo.type, pathInfo.segmentPath);

  //only the latest data is searchable
  existingRecipient.subscriptions.push({
    id: subscriptionId,
    data: recipient.data,
    path: pathInfo.path ? pathInfo.path : '*'
  });

  return {id: subscriptionId};
};

PareTree.prototype.__configureWildcardSegment = function (segment) {

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

PareTree.prototype.__segmentPath = function (path) {

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

    if (segment.wildcardIndex == -1) return segment;//a precise segment

    this.__configureWildcardSegment(segment);
  }

  return segment;
};

PareTree.prototype.add = function (path, recipient) {

  if (recipient == null) throw new Error('no recipient for subscription');

  if (recipient.substring) recipient = {key: recipient};

  var pathInfo = this.__segmentPath(path);

  if (pathInfo.type === this.SEGMENT_TYPE.ALL) return this.__addAll(pathInfo, recipient);

  else  return this.__addSubscription(pathInfo, recipient);
};

PareTree.prototype.__removeAllSubscriptionEntry = function (subscriptionData, subscriptionId) {

  var recipient = this.__trunkAll.recipients[subscriptionData.key];

  if (recipient == null) return null;

  var removed = null;

  var _this = this;

  recipient.subscriptions.every(function (subscription, subscriptionIndex) {

    if (subscription.id === subscriptionId) {

      recipient.subscriptions.splice(subscriptionIndex, 1);

      removed = {id: subscriptionId};

      recipient.refCount -= 1;

      _this.__pruneAll(recipient, subscriptionData);

      _this.__releaseId(subscriptionId);

      return false;

    } else return true;
  });

  return removed;
};

PareTree.prototype.__pruneAll = function (recipient, subscriptionData) {

  if (recipient.subscriptions.length == 0) delete this.__trunkAll.recipients[subscriptionData.key];
};

PareTree.prototype.__prune = function (trunk, segment, branch, recipient, subscriptionData) {

  if (recipient.subscriptions.length == 0) delete branch.recipients[subscriptionData.key];

  if (Object.keys(branch.recipients).length == 0) {

    segment.branches.delete(subscriptionData.path);

    segment.branchCount--;

    this.__allBranches[subscriptionData.type].remove(subscriptionData.path.length, {'path':{$eq:subscriptionData.path}});
  }

  if (segment.branchCount <= 0) trunk.delete(subscriptionData.path.length);
};

PareTree.prototype.__removeWildcardSubscriptionEntry = function (subscriptionData, trunk, subscriptionId) {

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

      removed = {id: subscriptionId};

      recipient.refCount -= 1;

      _this.__prune(trunk, segment, branch, recipient, subscriptionData);

      _this.__releaseId(subscriptionId);

      return false;

    } else return true;
  });

  return removed;
};

PareTree.prototype.__removeSpecific = function (options) {

  var _this = this;

  var subscriptionData = _this.__decodeId(options.id);

  if (subscriptionData == null) return null;

  var trunk = _this.__getTrunk(subscriptionData);

  if (subscriptionData.type === this.SEGMENT_TYPE.ALL)
    return _this.__removeAllSubscriptionEntry(subscriptionData, options.id);

  return _this.__removeWildcardSubscriptionEntry(subscriptionData, trunk, options.id);
};

PareTree.prototype.__removeByPath = function (path) {

  var _this = this;

  var removed = [];

  //remove all if no options or remove('*') or remove('') or remove('***')
  if (!path || path.replace(/[*]/g, '') == '') {
    this.__initialize();//resets the tree
    return [];
  }

  //loop through them removing each specific one
  _this.search(path, {excludeAll: true}).forEach(function (subscriptionEntry) {

    var removedResult = _this.__removeSpecific({
      id: subscriptionEntry.id
    });

    if (removedResult != null) removed.push(removedResult);
  });

  return removed;
};

PareTree.prototype.remove = function (options) {

  var removed;

  if (!options || options.substring) removed = this.__removeByPath(options);

  else if (options.id) removed = [this.__removeSpecific(options)];

  else if (options.path)
    removed = this.__removeByPath(options.path ? options.path : options.recipient ? options.recipient.path : options);

  else throw new Error('invalid remove options: ' + JSON.stringify(options));

  var removedFiltered = [];//cannot use array.filter because it is ECMA6

  removed.map(function (removedItem) {
    if (removedItem != null) removedFiltered.push(removedItem);
  });

  return removedFiltered;
};

PareTree.prototype.__wildcardMatch = function (pattern, matchTo) {

  if (matchTo == '*') return true;

  return wildcard.isMatch(matchTo, pattern);
};

PareTree.prototype.__decouple = function (results) {

  return results.map(function (result) {

    return JSON.parse(JSON.stringify(result));
  });
};

PareTree.prototype.__appendQueryRecipient = function (recipient, searchPath, appendTo, type) {

  var _this = this;

  return recipient.subscriptions.map(function (subscription) {

    if (type === _this.SEGMENT_TYPE.WILDCARD_COMPLEX && !_this.__wildcardMatch(subscription.path, searchPath)) return;

    appendTo.push({
      key: recipient.key,
      data: subscription.data,
      id: subscription.id,
      path: subscription.path
    });
  });
};

PareTree.prototype.__appendRecipients = function (searchPath, branch, subscriptions, type) {

  var _this = this;

  Object.keys(branch.recipients).forEach(function (recipientKey) {

    var recipient = branch.recipients[recipientKey];

    _this.__appendQueryRecipient(recipient, searchPath.path, subscriptions, type);
  });
};

PareTree.prototype.__iterateAllBranches = function (searchPath, subscriptions, handler, type) {

  if (this.__allBranches[type])
    this.__allBranches[type].array(true).forEach(function (branch) {
      handler(searchPath, branch, subscriptions, type);
    });
};

PareTree.prototype.__iterateAll = function (searchPath, subscriptions, handler) {

  if (this.__counts[this.SEGMENT_TYPE.ALL] == 0) return;

  handler(searchPath, this.__trunkAll, subscriptions, this.SEGMENT_TYPE.ALL);
};

PareTree.prototype.__iteratePrecise = function (searchPath, subscriptions, handler) {

  if (this.__counts[this.SEGMENT_TYPE.PRECISE] == 0) return;

  var _this = this;

  if (searchPath.type === _this.SEGMENT_TYPE.ALL) {

    for (var i = _this.__lowerBounds[_this.SEGMENT_TYPE.PRECISE]; i <= _this.__upperBounds[_this.SEGMENT_TYPE.PRECISE]; i++) {

      _this.__trunkPrecise.search(i).forEach(function (segment) {

        Object.keys(segment.branches).forEach(function (branchPath) {

          if (_this.__wildcardMatch(branchPath, searchPath.path) === false) return;

          handler(searchPath, segment.branches[branchPath], subscriptions, _this.SEGMENT_TYPE.PRECISE);
        });
      });
    }
    return;
  }

  _this.__trunkPrecise.search(searchPath.path.length).forEach(function (segment) {

    segment.branches.search(searchPath.path).forEach(function(branch){
      handler(searchPath, branch, subscriptions, _this.SEGMENT_TYPE.PRECISE);
    });
  });
};

PareTree.prototype.__permutate = function (path, type) {

  var permutations = [];

  var _this = this;

  var permPath = path;

  if (this.__counts[type] == 0 || this.__counts[type] == null) {
   return [];//no possible permutations
  }

  if (type === _this.SEGMENT_TYPE.WILDCARD_RIGHT) {

    permPath = path.substring(0, _this.__upperBounds[type] + 1);

    for (var i = 0; i < permPath.length; i++) {

      permutations.push(permPath.substring(0, i));
    }
  }

  if (type === _this.SEGMENT_TYPE.WILDCARD_LEFT) {

    permPath = path.substring(path.length - (_this.__upperBounds[type]));

    for (var i = permPath.length; i > 0; i--) {
      permutations.push(permPath.substring(permPath.length - i));
    }
  }

  return permutations;
};

PareTree.prototype.__iterateBranches = function (path, subscriptions, handler, type, trunk) {

  trunk.search(path.length).forEach(function (segment) {

    segment.branches.search(path).forEach(function (branch) {

      handler(path, branch, subscriptions, type);
    });
  });
};

PareTree.prototype.__iterateWildcard = function (searchPath, subscriptions, handler) {

  var _this = this;

  _this.__permutate(searchPath.path, _this.SEGMENT_TYPE.WILDCARD_RIGHT).forEach(function (path) {
    _this.__iterateBranches(path, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_RIGHT, _this.__trunkWildcardRight);
  });

  _this.__permutate(searchPath.path, _this.SEGMENT_TYPE.WILDCARD_LEFT).forEach(function (path) {
    _this.__iterateBranches(path, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_LEFT, _this.__trunkWildcardLeft);
  });

  if (!_this.__allBranches[_this.SEGMENT_TYPE.WILDCARD_COMPLEX]) return;

  for (var i = 0; i <= searchPath.path.length; i++){

    _this.__allBranches[_this.SEGMENT_TYPE.WILDCARD_COMPLEX].search(i).forEach(function(branch){

      if (branch.path.length <= searchPath.path.length){
        handler(searchPath, branch, subscriptions, _this.SEGMENT_TYPE.WILDCARD_COMPLEX);
      }
    });
  }
};

PareTree.prototype.__searchAndAppend = function (searchPath, subscriptions, excludeAll) {

  var _this = this;

  var handler = _this.__appendRecipients.bind(_this);

  if (searchPath.path == '*') {

    this.__iterateAllBranches(searchPath, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_LEFT);

    this.__iterateAllBranches(searchPath, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_RIGHT);

    this.__iterateAllBranches(searchPath, subscriptions, handler, _this.SEGMENT_TYPE.WILDCARD_COMPLEX);

    this.__iterateAllBranches(searchPath, subscriptions, handler, _this.SEGMENT_TYPE.PRECISE);

  } else {

    this.__iteratePrecise(searchPath, subscriptions, handler);

    this.__iterateWildcard(searchPath, subscriptions, handler);
  }

  if (!excludeAll) this.__iterateAll(searchPath, subscriptions, handler);

};

PareTree.prototype.search = function (path, options) {

  if (typeof options == 'boolean') {
    options = {};
  }

  if (options == null) options = {};

  if (path == null || ['**', '***', '****'].indexOf(path) > -1) path = '*';

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

  this.__searchAndAppend(searchPath, subscriptions, options ? options.excludeAll : false);

  if (options.filter != null) subscriptions = sift(options.filter, subscriptions);

  if (options.decouple) subscriptions = this.__decouple(subscriptions);

  this.__cache.set(cacheKey, subscriptions);

  return subscriptions;
};

module.exports = PareTree;


