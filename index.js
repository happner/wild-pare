var LRU = require("lru-cache")
  , BinarySearchTree = require('binary-search-tree').BinarySearchTree
  , shortid = require('shortid')
  , uniqid = require('uniqid')
  ;

function PareTree(options) {

  this.options = options ? options : {};

  if (!this.options.cache) this.options.cache = {max: 5000};

  this.__initialize();
}

PareTree.prototype.__initialize = function(){

  this.__cache = new LRU(this.options.cache);

  this.__segmentCache = new LRU(this.options.cache);

  this.__wildcardRightSegments = new BinarySearchTree();

  this.__wildcardLeftSegments = new BinarySearchTree();

  this.__preciseSegments = new BinarySearchTree();

  this.__allRecipients = {};

  this.__wildcardCount = 0;

  this.__preciseCount = 0;

  this.__smallestPreciseSegment = 0;

  this.__greatestPreciseSegment = 0;

  this.__smallestWildcardRightSegment = 0;

  this.__greatestWildcardRightSegment = 0;

  this.__smallestWildcardLeftSegment = 0;

  this.__greatestWildcardLeftSegment = 0;

  this.__subscriptionIds = 0;
};

PareTree.prototype.__getSegment = function (path, tree, wildcard) {

  var key = path;

  if (wildcard) key += '__WILD';

  var segment = this.__segmentCache.get(key);

  if (segment) return segment;

  segment = tree.search(path.length)[0];

  this.__segmentCache.set(key, segment);

  return segment;
};

PareTree.prototype.__addAll = function (path, recipient) {

  var existingRecipient = this.__allRecipients[recipient.key];

  if (existingRecipient == null) {

    existingRecipient = {refCount: 0, data: {}, segment: path.length, path:path, key:recipient.key};
    this.__allRecipients[recipient.key] = existingRecipient;
  }

  existingRecipient.refCount += recipient.refCount ? recipient.refCount : 1;

  var subscriptionId = this.__subscriptionId(recipient.key, 'a', recipient.refCount, path);

  existingRecipient.data[subscriptionId] = recipient.data;

  return {
    recipient: existingRecipient,
    id: subscriptionId
  };
};

PareTree.prototype.__addPrecise = function (path, recipient) {

  this.__preciseCount++;

  if (this.__smallestPreciseSegment == 0 || path.length < this.__smallestPreciseSegment)
    this.__smallestPreciseSegment = path.length;

  if (this.__greatestPreciseSegment == 0 || path.length > this.__greatestPreciseSegment)
    this.__greatestPreciseSegment = path.length;

  var segment = path;

  var existingSegment = this.__getSegment(segment, this.__preciseSegments, false);

  if (!existingSegment) {

    existingSegment = {
      subscriptions: new BinarySearchTree()
    };

    this.__preciseSegments.insert(segment.length, existingSegment);
  }

  var subscriptionList = existingSegment.subscriptions;

  var existingSubscription = subscriptionList.search(segment)[0];

  if (existingSubscription == null) {

    existingSubscription = {recipients: {}};

    subscriptionList.insert(segment, existingSubscription);
  }

  var existingRecipient = existingSubscription.recipients[recipient.key];

  if (!existingRecipient) {

    existingRecipient = {refCount: 0, data: {}, segment: path.length, path:path, key:recipient.key};

    existingSubscription.recipients[recipient.key] = existingRecipient;
  }

  existingRecipient.refCount += recipient.refCount ? recipient.refCount : 1;

  var subscriptionId = this.__subscriptionId(recipient.key, 'p', existingRecipient.refCount, path);

  existingRecipient.data[subscriptionId] = recipient.data;

  return {recipient: existingRecipient, id: subscriptionId};
};

PareTree.prototype.__subscriptionId = function (recipientKey, subscriptionType, refCount, path) {

  return recipientKey + '&' + subscriptionType + '&' + refCount + '&' + path;
};

PareTree.prototype.__addWildcardRight = function (path, pathSegments, recipient, complex) {

  var segment = pathSegments[0];

  var existingSegment = this.__getSegment(segment, this.__wildcardRightSegments, true);

  if (!existingSegment) {

    existingSegment = {
      subscriptions: new BinarySearchTree()
    };

    this.__wildcardRightSegments.insert(segment.length, existingSegment);
  }

  if (this.__smallestWildcardRightSegment == 0 || segment.length < this.__smallestWildcardRightSegment)
    this.__smallestWildcardRightSegment = segment.length;

  if (this.__greatestWildcardRightSegment == 0 || segment.length > this.__greatestWildcardRightSegment)
    this.__greatestWildcardRightSegment = segment.length;

  var subscriptionList = existingSegment.subscriptions;

  var existingSubscription = subscriptionList.search(segment)[0];

  if (existingSubscription == null) {

    existingSubscription = {recipients: {}};

    subscriptionList.insert(segment, existingSubscription);
  }

  var existingRecipient = existingSubscription.recipients[recipient.key];

  if (!existingRecipient) {

    existingRecipient = {refCount: 0, data: {}, segment: segment.length, path:path, complex:complex?true:false, key:recipient.key};

    existingSubscription.recipients[recipient.key] = existingRecipient;
  }

  existingRecipient.refCount += recipient.refCount ? recipient.refCount : 1;

  var subscriptionId = this.__subscriptionId(recipient.key, 'wr', existingRecipient.refCount, path);

  existingRecipient.data[subscriptionId] = recipient.data;

  return {recipient: existingRecipient, id: subscriptionId};
};

PareTree.prototype.__addWildcardLeft = function (path, pathSegments, recipient, complex) {

  var segment = pathSegments[pathSegments.length - 1];

  var existingSegment = this.__getSegment(segment, this.__wildcardLeftSegments, true);

  if (!existingSegment) {

    existingSegment = {
      subscriptions: new BinarySearchTree()
    };

    this.__wildcardLeftSegments.insert(segment.length, existingSegment, pathSegments);
  }

  if (this.__smallestWildcardLeftSegment == 0 || segment.length < this.__smallestWildcardLeftSegment)
    this.__smallestWildcardLeftSegment = segment.length;

  if (this.__greatestWildcardLeftSegment == 0 || segment.length > this.__greatestWildcardLeftSegment)
    this.__greatestWildcardLeftSegment = segment.length;

  var subscriptionList = existingSegment.subscriptions;

  var existingSubscription = subscriptionList.search(segment)[0];

  if (existingSubscription == null) {

    existingSubscription = {recipients: {}};

    subscriptionList.insert(segment, existingSubscription);
  }

  var existingRecipient = existingSubscription.recipients[recipient.key];

  if (!existingRecipient) {

    existingRecipient = {refCount: 0, data: {}, segment: segment.length, path:path, complex:complex?true:false, key:recipient.key};

    existingSubscription.recipients[recipient.key] = existingRecipient;
  }

  existingRecipient.refCount += recipient.refCount ? recipient.refCount : 1;

  var subscriptionId = this.__subscriptionId(recipient.key, 'wl', existingRecipient.refCount, path);

  existingRecipient.data[subscriptionId] = recipient.data;

  return {recipient: existingRecipient, id: subscriptionId};
};

PareTree.prototype.__addWildcard = function (path, recipient) {

  this.__wildcardCount++;

  var pathSegments = path.split('*');

  var wildcardIndex = path.indexOf('*');

  var pathLength = path.length;

  //path lile /test/*/blah, or /*/blah/*longer/side
  if (pathSegments.length > 2 || wildcardIndex > 0 && wildcardIndex < pathLength) {
    //path like /test/long/*/short
    if (pathSegments[0].length > pathSegments[pathSegments.length - 1].length) return this.__addWildcardRight(path, pathSegments, recipient, true);
    //path like /short/*/test/long or /short/*/*/test/long
    return this.__addWildcardLeft(path, pathSegments, recipient, true);
  }

  //path lile */test
  if (wildcardIndex == 0) return this.__addWildcardLeft(path, pathSegments, recipient);
  //path lile /test/*
  return this.__addWildcardRight(path, pathSegments, recipient);
};

PareTree.prototype.add = function (path, recipient) {

  if (path.indexOf('*') > -1) {

    if (path.replace(/[*]/g, '') == '') return this.__addAll(path, recipient);

    return this.__addWildcard(path, recipient);
  }
  return this.__addPrecise(path, recipient);
};

PareTree.prototype.__removeAllSubscriptionEntry = function(entry, refcount, key){

  entry.refCount -= refcount;

  if (entry.refCount <= 0) delete this.__allRecipients[key];
};

PareTree.prototype.__removeSubscriptionEntry = function(entry, refcount, tree, segmentInst, recipients, key, id, segment){

  entry.refCount -= refcount;

  delete entry.data[id];

  //prune recipients
  if (entry.refCount <= 0) recipients.remove(key);
  //prune segment path
  if (recipients.data.length == 0)  segmentInst.remove(segment);
  //prune segment branch
  if (segmentInst.data.length == 0)  tree.remove(segment.length);
};

PareTree.prototype.__removeSpecific = function(options){

  var _this = this;

  var parts = options.id.split('&');

  var recipientKey = parts[0];

  var subscriptionType = parts[1];

  var subscriptionRefcount = parts[2];

  var subscriptionPath = parts.slice(3, parts.length).join('&'); //remainder is the path

  var subscriptionTree;

  var subscriptionEntry;

  var subscriptionSegment;

  var subscriptionSegmentInst;

  var direction;

  if (['wl', 'wr'].indexOf(subscriptionType) > -1){

    direction = subscriptionType.substring(1, 2);

    if (direction == 'l') subscriptionTree = _this.__wildcardLeftSegments;

    else subscriptionTree = _this.__wildcardRightSegments;
  }

  if (subscriptionType == 'p') subscriptionTree = _this.__preciseSegments;

  if (subscriptionTree){

    var pathSegments = subscriptionPath.split('*');

    if (direction == 'l') {

      subscriptionSegment = pathSegments[pathSegments.length - 1];
      subscriptionSegmentInst = this.__getSegment(pathSegments[pathSegments.length - 1], subscriptionTree, true);
    }

    else if (direction == 'r') {

      subscriptionSegment = pathSegments[0];
      subscriptionSegmentInst = this.__getSegment(pathSegments[0], subscriptionTree, true);
    }

    else {

      subscriptionSegment = subscriptionPath;
      subscriptionSegmentInst = this.__getSegment(subscriptionPath, subscriptionTree, false);
    }


    if (!subscriptionSegment) return null;

    var recipientsList = subscriptionSegmentInst.subscriptions.search(subscriptionSegment)[0];

    if (recipientsList == null) return null;

    subscriptionEntry = recipientsList.recipients.search(recipientKey)[0];

    if (subscriptionEntry == null) return null;

    return _this.__removeSubscriptionEntry(subscriptionEntry, subscriptionRefcount, subscriptionTree, subscriptionSegmentInst, recipientsList, options.id);
  }

  if (subscriptionType == 'a'){

    subscriptionTree = _this.__allRecipients;

    subscriptionEntry = subscriptionTree[recipientKey];

    if (subscriptionEntry == null) return null;

    return _this.__removeAllSubscriptionEntry(subscriptionEntry, subscriptionRefcount, options.id);
  }
};

PareTree.prototype.__removeByPath = function(options){

  var _this = this;

  var path = options.path?options.path:options;

  var refCount = options.refCount?options.refCount:0;

  //get subscription instances
  var subscriptions = _this.search(path);

  var removed = [];

  //loop through them removing each specific one
  subscriptions.forEach(function(subscriptionEntry){

    var removedResult = _this.__removeSpecific({
      id:subscriptionEntry.id,
      refCount:refCount?refCount:subscriptionEntry.refCount
    });

    if (removedResult) removed.push(removedResult);
  });

  return removed;
};

PareTree.prototype.remove = function (options) {

  //remove all if no options or remove('*') or remove('') or remove('***')
  if (!options || (options.replace != null && options.replace(/[*]/g, '') == '')) return this.__initialize();//resets the tree

  if (options.substring) return this.__removeByPath(options);

  if (options.path) return this.__removeByPath(options);

  if (options.id) return this.__removeSpecific(options);

  throw new Error('invalid remove options: ' + JSON.stringify(options));
};

PareTree.prototype.__wildcardMatch = function (pattern, matchTo) {

  var regex = new RegExp(pattern.replace(/[*]/g, '.*'));

  var matchResult = matchTo.match(regex);

  if (matchResult) return true;

  return false;
};

PareTree.prototype.__appendRecipientsBySegment = function (path, segment, subscriptionList, appendTo) {

  var _this = this;

  if (subscriptionList == null) return;

  var existingSubscription = subscriptionList.subscriptions.search(segment)[0];

  if (existingSubscription == null) return;

  Object.keys(existingSubscription.recipients).forEach(function(recipientKey){

    var recipient = existingSubscription.recipients[recipientKey];

    if (recipient.complex && _this.__wildcardMatch(recipient.path, path) == false) return;

    appendTo.push(recipient);
  });
};


PareTree.prototype.__searchAndAppendWildcardRight = function (path, segments, subscriptions) {

  //get wildcard subscriptions, for everything up to a single character before the whole path:
  //ie: /s /si /sim /simp /simpl /simple /simple/ /simple/s /simple/si /simple/sim /simple/simo /simple/simon

  if (this.__wildcardCount == 0) return;

  for (var i = this.__smallestWildcardRightSegment; i <= this.__greatestWildcardRightSegment; i++) {

    this.__appendRecipientsBySegment(path, path.substring(0, i), segments.search(i)[0], subscriptions);
  }
};

PareTree.prototype.__searchAndAppendWildcardLeft = function (path, segments, subscriptions) {

  //get wildcard subscriptions, for everything up to a single character before the whole path:
  //ie: /s /si /sim /simp /simpl /simple /simple/ /simple/s /simple/si /simple/sim /simple/simo /simple/simon

  if (this.__wildcardCount == 0) return;

  for (var i = path.length; i >= this.__smallestWildcardLeftSegment; i--) {

    var segment = path.substring(path.length - i, path.length);

    this.__appendRecipientsBySegment(path, segment, segments.search(i)[0], subscriptions, true);
  }
};

PareTree.prototype.__searchAndAppendPrecise = function (path, recipients) {

  var subscriptionList = this.__preciseSegments.search(path.length);

  if (subscriptionList[0]) this.__appendRecipientsBySegment(path, path, subscriptionList[0], recipients);
};

PareTree.prototype.__searchAndAppendAll = function (recipients) {

  var _this = this;

  Object.keys(_this.__allRecipients).forEach(function(recipientKey){
    recipients.push(_this.__allRecipients[recipientKey]);
  });
};

PareTree.prototype.search = function (path) {

  var recipients = this.__cache.get(path);

  if (recipients != null) return recipients;

  else recipients = [];

  this.__searchAndAppendPrecise(path, recipients);

  this.__searchAndAppendWildcardRight(path, this.__wildcardRightSegments, recipients);

  this.__searchAndAppendWildcardLeft(path, this.__wildcardLeftSegments, recipients);

  this.__searchAndAppendAll(recipients);

  this.__cache.set(path, recipients);

  return recipients;
};

module.exports = PareTree;


