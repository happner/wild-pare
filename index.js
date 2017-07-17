var LRU = require("lru-cache")
  , BinarySearchTree = require('binary-search-tree').BinarySearchTree
  , hyperid = require('./lib/id')//require('uniqid')
  , uniqid = new hyperid()
  , sift = require('sift')
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
  WILDCARD_COMPLEX: 3
};

PareTree.prototype.__initialize = function () {

  this.__cache.reset();

  this.__trunkLeft = new BinarySearchTree();

  this.__trunkRight = new BinarySearchTree();

  this.__trunkComplex = new BinarySearchTree();

  this.__trunkPrecise = new BinarySearchTree();

  this.__trunkAll = {
    recipients: new BinarySearchTree()
  };

  this.__counts = [];

  this.__subscriptionData = new BinarySearchTree();

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
  ;

  this.__analytics.averages[key] = this.__analytics.accumulated[key] / this.__analytics.counters[key];
};

PareTree.prototype.__getTrunk = function (pathInfo) {

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_LEFT) return this.__trunkLeft;

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_RIGHT) return this.__trunkRight;

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_COMPLEX) return this.__trunkComplex;

  return this.__trunkPrecise;
};

PareTree.prototype.__addAll = function (pathInfo, recipient) {

  var existingRecipient = this.__trunkAll.recipients.search(recipient.key)[0];

  console.log('existing:::', existingRecipient);

  if (existingRecipient == null) {

    existingRecipient = {
      refCount: 0,
      segment: pathInfo.path.length,
      path: pathInfo.path,
      key: recipient.key,
      subscriptions: []
    };

    console.log('inserting:::', recipient.key, existingRecipient);

    this.__trunkAll.recipients.insert(recipient.key, existingRecipient);
  }

  existingRecipient.refCount += (recipient.refCount ? recipient.refCount : 1);

  var subscriptionId = this.__createId(recipient.key, this.SEGMENT_TYPE.ALL, pathInfo.path);

  existingRecipient.subscriptions.push({id: subscriptionId, data: recipient.data});

  return {id: subscriptionId};
};

PareTree.prototype.__releaseId = function (id) {

  var subscriptionData = this.__decodeId(id);

  this.__updateBounds(subscriptionData.type, -1);

  //this.__subscriptionData.delete(id);
};

PareTree.prototype.__decodeId = function (id) {

  var sections = id.split('&');

  return {
    key:sections[0],
    type:parseInt(sections[1]),
    id:sections[2],
    path:sections.slice(3).join('')
  };

  //return this.__subscriptionData.search(id)[0];
};

PareTree.prototype.__createId = function (recipientKey, subscriptionType, path) {

  var id = uniqid();

  this.__updateBounds(subscriptionType, 1, path);

  //this.__subscriptionData.insert(id, {key:recipientKey, type:subscriptionType, path:path});

  return recipientKey + '&' + subscriptionType + '&'  + id + '&' + path;
};

PareTree.prototype.__updateBounds = function (subscriptionType, count, path) {

  if (count == null) count = 1;

  if (this.__counts[subscriptionType] == null) this.__counts[subscriptionType] = 0;

  this.__counts[subscriptionType] += count;

  this.__cache.reset();

  //TODO: work out the smallest/largest segment sized so we can further limit wildcard searches
};

PareTree.prototype.__addSubscription = function (pathInfo, recipient) {

  //this.__averageTimeStart('this.__getTree'); //after trying to understand a flame graph I decided to do this, much simpler to understand...

  //this.__averageTimeEnd('this.__getTree');

  //this.__averageTimeStart('this.__getSegment');

  var trunk = this.__getTrunk(pathInfo);

  var segmentBranch = trunk.search(pathInfo.segmentPath.length)[0];

  //this.__averageTimeEnd('this.__getSegment');

  //this.__averageTimeStart('!existingSegment');

  if (!segmentBranch) {

    segmentBranch = {
      type: pathInfo.type,
      branches: new BinarySearchTree()
    };

    trunk.insert(pathInfo.segmentPath.length, segmentBranch);
  }

  //this.__averageTimeEnd('!existingSegment');

  //this.__averageTimeStart('subscriptionList.search(segment)');

  var segment = segmentBranch.branches.search(pathInfo.segmentPath)[0];

  if (segment == null) {

    segment = {recipients: new BinarySearchTree(), path: pathInfo.segmentPath};

    segmentBranch.branches.insert(pathInfo.segmentPath, segment);
  }

  //this.__averageTimeEnd('subscriptionList.search(segment)');

  //this.__averageTimeStart('existingSubscription.recipients[recipient.key]');

  var existingRecipient = segment.recipients.search(recipient.key)[0];

  if (!existingRecipient) {

    existingRecipient = {
      refCount: 0,
      segment: segment.length,
      path: pathInfo.path,
      complex: pathInfo.complex,
      key: recipient.key,
      subscriptions: []
    };

    segment.recipients.insert(recipient.key, existingRecipient);
  }

  existingRecipient.refCount += (recipient.refCount == null || recipient.refCount == 0 ? 1 : recipient.refCount);

  //this.__averageTimeEnd('existingSubscription.recipients[recipient.key]');

  //this.__averageTimeStart('this.__subscriptionId');

  var subscriptionId = this.__createId(recipient.key, pathInfo.type, pathInfo.segmentPath);

  //only the latest data is searchable
  existingRecipient.subscriptions.push({
    id: subscriptionId,
    data: recipient.data
  });

  return {id: subscriptionId};
};

PareTree.prototype.__getLargestContiguous = function (segment) {

  var returnSegment = segment.pathSegments[1];//assuming we are bounded by a *

  segment.pathSegments.slice(1, segment.pathSegments.length).every(function (segment) {
    if (segment.length > returnSegment) returnSegment = segment;
  });

  return returnSegment;
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

    segment.segmentRight = segment.pathSegments[segment.pathSegments.length - 1];

    segment.segmentLeft = segment.pathSegments[0];

    if (segment.pathSegments.length > 2 || (segment.wildcardIndex > 0 && segment.wildcardIndex < (segment.pathLength - 1))) {

      segment.complex = true;

      // complex/*/path/
      if (segment.pathLeftEnd != '*' && segment.pathRightEnd != '*') {

        if (segment.segmentLeft.length >= segment.segmentRight.length) {
          segment.type = this.SEGMENT_TYPE.WILDCARD_RIGHT;
          segment.segmentPath = segment.segmentLeft;
        }
        else {
          segment.type = this.SEGMENT_TYPE.WILDCARD_LEFT;
          segment.segmentPath = segment.segmentRight;
        }

        return segment;
      }

      // */complex/path/* or */complex*/path* - nasty
      if (segment.pathLeftEnd == '*' && segment.pathRightEnd == '*') {

        segment.type = this.SEGMENT_TYPE.WILDCARD_COMPLEX;
        segment.segmentPath = this.__getLargestContiguous(segment);//gets the biggest piece

        return segment;
      }
    }

    //path like */test/left/*/complex or */test/not/complex
    if (segment.pathLeftEnd == '*') {

      segment.type = this.SEGMENT_TYPE.WILDCARD_LEFT;
      segment.segmentPath = segment.segmentRight;
    }

    //path like /test/right/*/complex/* or /test/right/not/complex/*
    if (segment.pathRightEnd == '*') {

      segment.type = this.SEGMENT_TYPE.WILDCARD_RIGHT;
      segment.segmentPath = segment.segmentLeft;
    }
  }

  return segment;
};

PareTree.prototype.__addInternal = function(path, recipient){

  if (recipient == null) throw new Error('no recipient for subscription');

  if (recipient.substring) recipient = {key: recipient};

  var pathInfo = this.__segmentPath(path);

  console.log('adding:::', pathInfo);

  if (pathInfo.type === this.SEGMENT_TYPE.ALL) return this.__addAll(pathInfo, recipient);

  else  return this.__addSubscription(pathInfo, recipient);
};

PareTree.prototype.add = function (path, recipient, callback) {

  var _this = this;

  if (!callback) return _this.__addInternal(path, recipient);

  setImmediate(function(){

    try{

      var result = _this.__addInternal(path, recipient);

      callback(null, result);

    }catch(e){
      callback(e);
    }
  })
};

PareTree.prototype.__removeAllSubscriptionEntry = function (subscriptionData, subscriptionId) {

  var recipient = this.__trunkAll.recipients.search(subscriptionData.key)[0];

  if (recipient == null) return null;

  var removed = null;

  var _this = this;

  recipient.subscriptions.every(function(subscription, subscriptionIndex){

    if (subscription.id === subscriptionId){

      recipient.subscriptions.splice(subscriptionIndex, 1);

      removed = {id:subscriptionId};

      recipient.refCount -= 1;

      _this.__releaseId(subscriptionId);

      return false;

    } else return true;
  });

  //prune the tree if necessary
  if (removed != null) _this.__pruneAll(recipient, subscriptionData);

  return removed;
};

PareTree.prototype.__pruneAll = function(recipient, subscriptionData){

  if (recipient.subscriptions.length == 0) this.__trunkAll.recipients.delete(subscriptionData.key);
};

PareTree.prototype.__prune = function(trunk, segment, branch, recipient, subscriptionData){

  if (recipient.subscriptions.length == 0) branch.recipients.delete(subscriptionData.key);

  if (branch.recipients.data.length == 0) segment.branches.delete(subscriptionData.path);

  if (segment.branches.data.length == 0) trunk.delete(subscriptionData.path.length);
};

PareTree.prototype.__removeWildcardSubscriptionEntry = function(subscriptionData, trunk, subscriptionId){

  var segment = trunk.search(subscriptionData.path.length)[0];

  if (segment == null) return null;

  var branch = segment.branches.search(subscriptionData.path)[0];

  if (branch == null) return null;

  var recipient = branch.recipients.search(subscriptionData.key)[0];

  if (recipient == null) return null;

  if (recipient.subscriptions.length == 0) return null;

  var removed = null;

  var _this = this;

  recipient.subscriptions.every(function(subscription, subscriptionIndex){

    if (subscription.id === subscriptionId){

      recipient.subscriptions.splice(subscriptionIndex, 1);

      removed = {id:subscriptionId};

      recipient.refCount -= 1;

      _this.__releaseId(subscriptionId);

      return false;

    } else return true;
  });

  //prune the tree if necessary
  if (removed != null) _this.__prune(trunk, segment, branch, recipient, subscriptionData);

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
  _this.search(path, {excludeAll:true}).forEach(function (subscriptionEntry) {

    var removedResult = _this.__removeSpecific({
      id: subscriptionEntry.id
    });

    if (removedResult != null) removed.push(removedResult);
  });

  return removed;
};

PareTree.prototype.__removeInternal = function(options){

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


PareTree.prototype.remove = function (options, callback) {

  var _this = this;

  if (!callback) return _this.__removeInternal(options);

  setImmediate(function(){

    try{

      var result = _this.__removeInternal(options);

      callback(null, result);

    }catch(e){
      callback(e);
    }
  })

};

PareTree.prototype.__wildcardMatch = function (pattern, matchTo) {

  var regex = new RegExp(pattern.replace(/[*]/g, '.*'));

  var matchResult = matchTo.match(regex);

  if (matchResult) return true;

  return false;
};

PareTree.prototype.__decouple = function (results) {

  return results.map(function (result) {

    return JSON.parse(JSON.stringify(result));
  });
};

PareTree.prototype.__appendQueryRecipient = function (raw, appendTo) {

  return raw.subscriptions.map(function (subscription) {
    appendTo.push({
      key: raw.key,
      data: subscription.data,
      id: subscription.id
    });
  });
};

PareTree.prototype.__appendRecipients = function (searchPath, branch, subscriptions, type) {

  var _this = this;

  branch.recipients.data.forEach(function (recipient) {

    //if we have a left or right wildcard with more than one *, WILDCARD_COMPLEX segments have been checked already
    if ([_this.SEGMENT_TYPE.WILDCARD_LEFT, _this.SEGMENT_TYPE.WILDCARD_RIGHT].indexOf(type) > -1 &&
      recipient.complex && _this.__wildcardMatch(recipient.path, path) == false) return;

    _this.__appendQueryRecipient(recipient, subscriptions);
  });
};

PareTree.prototype.__iterateAll = function (searchPath, subscriptions, handler) {

  //simon simo sim si s

  if (this.__counts[this.SEGMENT_TYPE.ALL] == 0) return;

  console.log('iterate all:::', JSON.stringify(this.__trunkAll.recipients.data, null, 2));

  handler(searchPath, this.__trunkAll, subscriptions, this.SEGMENT_TYPE.ALL);
};

PareTree.prototype.__iteratePrecise = function (searchPath, subscriptions, handler) {

  //simon simo sim si s

  if (this.__counts[this.SEGMENT_TYPE.PRECISE] == 0) return;

  var _this = this;

  _this.__trunkPrecise.search(searchPath.length).forEach(function (segment) {

    segment.branches.search(searchPath).forEach(function (branch) {

      handler(searchPath, branch, subscriptions, _this.SEGMENT_TYPE.PRECISE);
    });
  });
};

PareTree.prototype.__iterateLeft = function (searchPath, subscriptions, handler) {

  //simon imon mon on n

  if (this.__counts[this.SEGMENT_TYPE.WILDCARD_LEFT] == 0) return;

  var _this = this;

  for (var i = searchPath.length; i >= 0; i--) {

    var searchSegment = searchPath.substring(searchPath.length - i);

    _this.__trunkLeft.search(i).forEach(function (segment) {

      segment.branches.search(searchSegment).forEach(function (branch) {

        handler(searchSegment, branch, subscriptions, _this.SEGMENT_TYPE.WILDCARD_LEFT);
      });
    });
  }
};

PareTree.prototype.__iterateRight = function (searchPath, subscriptions, handler) {

  //simon simo sim si s

  if (this.__counts[this.SEGMENT_TYPE.WILDCARD_RIGHT] == 0) return;

  var _this = this;

  for (var i = 0; i < searchPath.length; i++) {

    var searchSegment = searchPath.substring(0, i);

    _this.__trunkRight.search(i).forEach(function (segment) {

      segment.branches.search(searchSegment).forEach(function (branch) {

        handler(searchSegment, branch, subscriptions, _this.SEGMENT_TYPE.WILDCARD_RIGHT);
      });
    });
  }
};

PareTree.prototype.__iterateComplex = function (searchPath, subscriptions, handler) {

  if (this.__counts[this.SEGMENT_TYPE.WILDCARD_COMPLEX] == 0) return;

  var _this = this;

  for (var i = 0; i < searchPath.length; i++) {

    _this.__trunkComplex.search(i).forEach(function (segment) {

      //got to look through all the branches
      segment.branches.data.forEach(function (branch) {

        if (searchPath.indexOf(branch.path) == -1 || _this.__wildcardMatch(branch.path, searchPath) == false) return;
        handler(searchPath, branch, subscriptions, _this.SEGMENT_TYPE.WILDCARD_COMPLEX);
      });
    });
  }
};

PareTree.prototype.__searchAndAppend = function (searchPath, subscriptions, excludeAll) {

  var _this = this;

  this.__iteratePrecise(searchPath, subscriptions, _this.__appendRecipients.bind(_this));

  this.__iterateRight(searchPath, subscriptions, _this.__appendRecipients.bind(_this));

  this.__iterateLeft(searchPath, subscriptions, _this.__appendRecipients.bind(_this));

  this.__iterateComplex(searchPath, subscriptions, _this.__appendRecipients.bind(_this));

  if (!excludeAll) this.__iterateAll(searchPath, subscriptions, _this.__appendRecipients.bind(_this));
};

PareTree.prototype.__searchInternal = function(path, options){

//cache key is comprised of the path, and the options stringified,
  // so we dont cache something that has been filtered and then
  // do a search without a filter and get the filtered data
  var subscriptions = this.__cache.get(path + JSON.stringify(options));

  if (subscriptions != null) return subscriptions;

  else subscriptions = [];

  this.__searchAndAppend(path, subscriptions, options?options.excludeAll:false);

  if (options.filter != null) subscriptions = sift(options.filter, subscriptions);

  if (options.decouple) subscriptions = this.__decouple(subscriptions);

  this.__cache.set(path + JSON.stringify(options), subscriptions);

  return subscriptions;
};

PareTree.prototype.search = function (path, options, callback) {

  var _this = this;

  if (typeof options == 'boolean') {
    excludeAll = options;
    options = {};
  }

  if (options == null) options = {};

  if (path == null) path = '*';

  if (path.path) {
    options = path;
    path = path.path
  }

  if (!callback) return _this.__searchInternal(path, options);

  setImmediate(function(){

    try{

      var result = _this.__searchInternal(path, options);

      callback(null, result);

    }catch(e){
      callback(e);
    }
  })
};

module.exports = PareTree;


