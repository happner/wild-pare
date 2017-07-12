var LRU = require("lru-cache")
  , BinarySearchTree = require('binary-search-tree').BinarySearchTree
  , uniqid = require('uniqid')
  ;

function PareTree(options) {

  this.options = options ? options : {};

  if (!this.options.cache) this.options.cache = {max: 5000};

  this.__initialize();
}

PareTree.prototype.SEGMENT_TYPE = {
  ALL:-1,
  PRECISE:0,
  WILDCARD_LEFT:1,
  WILDCARD_RIGHT:2,
  WILDCARD_COMPLEX:3
};

PareTree.prototype.__initialize = function(){

  this.__cache = new LRU(this.options.cache);

  this.__wildcardRightSegments = new BinarySearchTree();

  this.__wildcardLeftSegments = new BinarySearchTree();

  this.__wildcardComplexSegments = [];

  this.__preciseSegments = new BinarySearchTree();

  this.__allRecipients = {};

  this.__wildcardCount = 0;

  this.__preciseCount = 0;

  this.__allCount = 0;

  this.__complexCount = 0;

  this.__smallestPreciseSegment = 0;

  this.__greatestPreciseSegment = 0;

  this.__smallestWildcardRightSegment = 0;

  this.__greatestWildcardRightSegment = 0;

  this.__smallestWildcardLeftSegment = 0;

  this.__greatestWildcardLeftSegment = 0;
};

PareTree.prototype.__getSegment = function (path, tree) {

  return tree.search(path.length)[0];
};

PareTree.prototype.__getTree = function (type) {

  if (type == this.SEGMENT_TYPE.WILDCARD_LEFT) return this.__wildcardLeftSegments;
  if (type == this.SEGMENT_TYPE.WILDCARD_RIGHT) return this.__wildcardRightSegments;

  return this.__preciseSegments;
};

PareTree.prototype.__addAll = function (pathInfo, recipient) {

  var existingRecipient = this.__allRecipients[recipient.key];

  if (existingRecipient == null) {

    existingRecipient = {refCount: 0, data: {}, segment: pathInfo.path.length, path:pathInfo.path, key:recipient.key};
    this.__allRecipients[recipient.key] = existingRecipient;
  }

  existingRecipient.refCount += recipient.refCount ? recipient.refCount : 1;

  var subscriptionId = this.__subscriptionId(recipient.key, this.SEGMENT_TYPE.ALL, recipient.refCount, pathInfo.path);

  existingRecipient.data[subscriptionId] = recipient.data;

  this.__updateBounds(pathInfo);

  return {id:subscriptionId};
};


PareTree.prototype.__subscriptionId = function (recipientKey, subscriptionType, refCount, path) {

  return recipientKey + '&' + subscriptionType + '&' + (!refCount?1:refCount) + '&' + uniqid() + '&' + path;
};

PareTree.prototype.__updateBounds = function(pathInfo, count){

  if (count == null) count = 1;

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_LEFT){

    this.__wildcardCount += count;
  }

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_RIGHT){

    this.__wildcardCount += count;
  }

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_COMPLEX){

    this.__complexCount += count;
  }

  if (pathInfo.type === this.SEGMENT_TYPE.PRECISE){

    this.__preciseCount += count;
  }
};

PareTree.prototype.__addSubscription = function(pathInfo, recipient){

  var segment = pathInfo.segmentPath;

  var tree = this.__getTree(pathInfo.type);

  var existingSegment = this.__getSegment(segment, tree);

  if (!existingSegment) {

    existingSegment = {
      subscriptions: new BinarySearchTree()
    };

    tree.insert(segment.length, existingSegment);

    this.__updateBounds(pathInfo);
  }

  var subscriptionList = existingSegment.subscriptions;

  var existingSubscription = subscriptionList.search(segment)[0];

  if (existingSubscription == null) {

    existingSubscription = {recipients: {}};

    subscriptionList.insert(segment, existingSubscription);
  }

  var existingRecipient = existingSubscription.recipients[recipient.key];

  if (!existingRecipient) {

    existingRecipient = {refCount: 0, data: {}, segment: segment.length, path:pathInfo.path, complex:pathInfo.complex, key:recipient.key};

    existingSubscription.recipients[recipient.key] = existingRecipient;
  }

  existingRecipient.refCount += recipient.refCount ? recipient.refCount : 1;

  var subscriptionId = this.__subscriptionId(recipient.key, pathInfo.type, recipient.refCount, pathInfo.path);

  existingRecipient.data[subscriptionId] = recipient.data;

  return {id:subscriptionId};
};

//TODO - why was this so much faster???
// PareTree.prototype.__addPrecise = function (pathInfo, recipient) {
//
//   this.__preciseCount++;
//
//   var segment = pathInfo.path;
//
//   var existingSegment = this.__getSegment(segment, this.__preciseSegments);
//
//   if (!existingSegment) {
//
//     existingSegment = {
//       subscriptions: new BinarySearchTree()
//     };
//
//     this.__preciseSegments.insert(segment.length, existingSegment);
//   }
//
//   var subscriptionList = existingSegment.subscriptions;
//
//   var existingSubscription = subscriptionList.search(segment)[0];
//
//   if (existingSubscription == null) {
//
//     existingSubscription = {recipients: {}};
//
//     subscriptionList.insert(segment, existingSubscription);
//   }
//
//   var existingRecipient = existingSubscription.recipients[recipient.key];
//
//   if (!existingRecipient) {
//
//     existingRecipient = {refCount: 0, data: {}, segment: segment.length, path:segment, key:recipient.key};
//
//     existingSubscription.recipients[recipient.key] = existingRecipient;
//   }
//
//   existingRecipient.refCount += recipient.refCount ? recipient.refCount : 1;
//
//   var subscriptionId = this.__subscriptionId(recipient.key, this.SEGMENT_TYPE.PRECISE, recipient.refCount, segment);
//
//   existingRecipient.data[subscriptionId] = recipient.data;
//
//   this.__updateBounds(pathInfo.type, segment);
//
//   return {id:subscriptionId};
// };

PareTree.prototype.__firstMatchingComplex = function (path) {

  var _this = this, found = null;

  this.__wildcardComplexSegments.every(function(segment, segmentIndex){

    if (_this.__wildcardMatch(segment.path, path)) {
      found = {segment:segment, index:segmentIndex};
      return false;
    }
    return true;
  });

  return found;
};

PareTree.prototype.__addWildcardComplex = function (pathInfo, recipient) {

  var existingSegment = this.__firstMatchingComplex(pathInfo.path);

  if (!existingSegment) {

    existingSegment = {
      path:pathInfo.path,
      recipients: {}
    };

    this.__wildcardComplexSegments.push(existingSegment);

    this.__updateBounds(pathInfo);

  } else existingSegment = existingSegment.segment;

  var existingRecipient = existingSegment.recipients[recipient.key];

  if (!existingRecipient) {

    existingRecipient = {refCount: 0, data: {}, segment: pathInfo.path.length, path:pathInfo.path, complex:true, key:recipient.key};

    existingSegment.recipients[recipient.key] = existingRecipient;
  }

  existingRecipient.refCount += recipient.refCount ? recipient.refCount : 1;

  var subscriptionId = this.__subscriptionId(recipient.key, this.SEGMENT_TYPE.WILDCARD_COMPLEX, recipient.refCount, pathInfo.path);

  existingRecipient.data[subscriptionId] = recipient.data;

  return {id:subscriptionId};
};

PareTree.prototype.__segmentPath = function(path){

  var segment = {
    type:this.SEGMENT_TYPE.PRECISE,
    segmentPath:path,
    pathSegments:path.split('*'),
    pathLength:path.length,
    pathRightEnd:path.substring(path.length - 1, path.length),
    pathLeftEnd:path.substring(0, 1),
    wildcardIndex:path.indexOf('*'),
    path:path,
    complex:false
  };

  if (path.replace(/[*]/g, '') == ''){

    segment.type = this.SEGMENT_TYPE.ALL;

  } else {

    if (segment.wildcardIndex == -1) return segment;//a precise segment

    segment.segmentRight = segment.pathSegments[segment.pathSegments.length -1];

    segment.segmentLeft = segment.pathSegments[0];

    if (segment.pathSegments.length > 2 || segment.wildcardIndex > 0 && segment.wildcardIndex < segment.pathLength) {

      segment.complex = true;

      // complex/*/path/
      if (segment.pathLeftEnd != '*' && segment.pathRightEnd != '*'){

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

PareTree.prototype.add = function (path, recipient) {

  var pathInfo = this.__segmentPath(path);

  if ([
      this.SEGMENT_TYPE.PRECISE,
      this.SEGMENT_TYPE.WILDCARD_LEFT,
      this.SEGMENT_TYPE.WILDCARD_RIGHT].indexOf(pathInfo.type) > -1) return this.__addSubscription(pathInfo, recipient);

  if (pathInfo.type === this.SEGMENT_TYPE.ALL) return this.__addAll(pathInfo, recipient);

  if (pathInfo.type === this.SEGMENT_TYPE.WILDCARD_COMPLEX) return this.__addWildcardComplex(pathInfo, recipient);
};

PareTree.prototype.__removeAllSubscriptionEntry = function(refcount, key, id){

  var subscriptionEntry = this.__allRecipients[key];

  if (subscriptionEntry == null) return null;

  subscriptionEntry.refCount -= refcount;

  delete subscriptionEntry.data[id];

  if (subscriptionEntry.refCount <= 0 || Object.keys(subscriptionEntry.data).length == 0) {

    delete this.__allRecipients[key];

    this.__updateBounds({type:this.SEGMENT_TYPE.ALL}, -1);

    return {id:id};
  }
};

PareTree.prototype.__removeSubscriptionEntry = function(entry, refcount, tree, segmentInst, recipientsList, key, id, segment, subscriptionType){

  entry.refCount -= refcount;

  delete entry.data[id];

  //prune recipients
  if (entry.refCount <= 0 || Object.keys(entry.data).length == 0) delete recipientsList.recipients[key];
  //prune segment path
  if (Object.keys(recipientsList.recipients).length == 0) segmentInst.subscriptions.delete(segment);
  //prune segment branch
  if (segmentInst.subscriptions.data.length == 0){

    tree.delete(segment.length);
    //update our segmentation bounds
    this.__updateBounds({type:subscriptionType, path:segment}, -1);
  }

  return {id:id};
};

PareTree.prototype.__removeComplexEntry = function(entry, refcount, key, id, segment, segmentIndex){

  entry.refCount -= refcount;

  delete entry.data[id];

  //prune recipients
  if (entry.refCount <= 0 || Object.keys(entry.data).length == 0) delete segment.recipients[key];

  //prune segment path
  if (Object.keys(segment.recipients).length == 0) {

    this.__wildcardComplexSegments.splice(1, segmentIndex);

    //update our segmentation bounds
    this.__updateBounds({type:this.SEGMENT_TYPE.WILDCARD_COMPLEX}, -1);
  }

  return {id:id};
};

PareTree.prototype.__removeComplexSubscriptionEntry = function(subscriptionPath, subscriptionRefcount, recipientKey, id){

  var existingSegment = this.__firstMatchingComplex(subscriptionPath);

  if (existingSegment != null){

    var segmentIndex = existingSegment.index;

    existingSegment = existingSegment.segment;

    var entry = existingSegment.recipients[recipientKey];

    if (entry != null) return this.__removeComplexEntry(entry, subscriptionRefcount, recipientKey, id, existingSegment, segmentIndex);
  }

  return null;
};


PareTree.prototype.__removeSpecific = function(options){

  var _this = this;

  var parts = options.id.split('&');

  var recipientKey = parts[0];

  var subscriptionType = parseInt(parts[1]);

  var subscriptionRefcount = parseInt(parts[2]);

  var subscriptionPath = parts.slice(4, parts.length).join('&'); //remainder is the path

  var subscriptionTree = _this.__preciseSegments;

  var subscriptionEntry;

  var subscriptionSegmentInst;

  if (subscriptionType == this.SEGMENT_TYPE.ALL)
    return _this.__removeAllSubscriptionEntry(subscriptionRefcount, recipientKey, options.id);

  if (subscriptionType == this.SEGMENT_TYPE.WILDCARD_COMPLEX)
    return _this.__removeComplexSubscriptionEntry(subscriptionPath, subscriptionRefcount, recipientKey, options.id);

  var pathSegments = subscriptionPath.split('*');

  var subscriptionSegmentPath = subscriptionPath;

  var subscriptionSearchPath = subscriptionPath;

  if (subscriptionType == this.SEGMENT_TYPE.WILDCARD_LEFT) {

    subscriptionTree = _this.__wildcardLeftSegments;
    subscriptionSegmentPath = pathSegments[1];
    subscriptionSearchPath = pathSegments[1];
  }

  if (subscriptionType == this.SEGMENT_TYPE.WILDCARD_RIGHT){

    subscriptionTree = _this.__wildcardRightSegments;
    subscriptionSegmentPath = pathSegments[0];
    subscriptionSearchPath = pathSegments[0];
  }


  subscriptionSegmentInst = subscriptionTree.search(subscriptionSegmentPath.length)[0];

  if (!subscriptionSegmentInst) return null;

  var recipientsList = subscriptionSegmentInst.subscriptions.search(subscriptionSearchPath)[0];

  if (recipientsList == null) return null;

  subscriptionEntry = recipientsList.recipients[recipientKey];

  if (subscriptionEntry == null) return null;

  return _this.__removeSubscriptionEntry (
    subscriptionEntry,
    subscriptionRefcount,
    subscriptionTree,
    subscriptionSegmentInst,
    recipientsList,
    recipientKey,
    options.id,
    subscriptionSearchPath,
    subscriptionType);
};

PareTree.prototype.__removeByPath = function(path){

  var _this = this;

  var removed = [];

  //remove all if no options or remove('*') or remove('') or remove('***')
  if (!path || path.replace(/[*]/g, '') == '') {
    this.__initialize();//resets the tree
    return [];
  }

  //loop through them removing each specific one
  _this.search(path, true).forEach(function(subscriptionEntry){

    Object.keys(subscriptionEntry.data).forEach(function(subscriptionId){

      var removedResult = _this.__removeSpecific({
        id:subscriptionId
      });

      if (removedResult) removed.push(removedResult);
    });
  });

  return removed;
};

PareTree.prototype.remove = function (options) {

  var removed, _this = this;

  if (!options || options.substring)
    removed = this.__removeByPath(options);

  else if (options.id)
    removed = [this.__removeSpecific(options)];

  else if (options.path || options.recipient && options.recipient.path)
    removed = this.__removeByPath(options.path?options.path:options.recipient?options.recipient.path:options);

  else throw new Error('invalid remove options: ' + JSON.stringify(options));

  _this.__cache.reset();

  var removedFiltered = [];//cannot use array.filter because it is ECMA6

  removed.map(function(removedItem){
    if (removedItem != null) removedFiltered.push(removedItem);
  });

  return removedFiltered;
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


PareTree.prototype.__searchAndAppendWildcardRight = function (path, subscriptions) {

  //get wildcard subscriptions, for everything up to a single character before the whole path:
  //ie: /s /si /sim /simp /simpl /simple /simple/ /simple/s /simple/si /simple/sim /simple/simo /simple/simon

  if (this.__wildcardCount == 0) return;

  for (var i = 0; i <= path.length; i++) {

    this.__appendRecipientsBySegment(path, path.substring(0, i), this.__wildcardRightSegments.search(i)[0], subscriptions);
  }
};

PareTree.prototype.__searchAndAppendWildcardLeft = function (path, subscriptions) {

  //get wildcard subscriptions, for everything up to a single character before the whole path:
  //ie: /s /si /sim /simp /simpl /simple /simple/ /simple/s /simple/si /simple/sim /simple/simo /simple/simon

  if (this.__wildcardCount == 0) return;

  //for (var i = path.length; i >= this.__smallestWildcardLeftSegment; i--) {
  for (var i = path.length; i >= 0; i--) {

    var segment = path.substring(path.length - i, path.length);

    this.__appendRecipientsBySegment(path, segment, this.__wildcardLeftSegments.search(i)[0], subscriptions, true);
  }
};

PareTree.prototype.__searchAndAppendPrecise = function (path, recipients) {

  if (this.__preciseCount == 0) return;

  var subscriptionList = this.__preciseSegments.search(path.length);

  if (subscriptionList[0]) this.__appendRecipientsBySegment(path, path, subscriptionList[0], recipients);
};

PareTree.prototype.__searchAndAppendAll = function (recipients) {

  var _this = this;

  Object.keys(_this.__allRecipients).forEach(function(recipientKey){
    recipients.push(_this.__allRecipients[recipientKey]);
  });
};

PareTree.prototype.__searchAndAppendWildcardComplex = function (path, recipients) {

  if (this.__complexCount == 0) return;

  var _this = this;

  _this.__wildcardComplexSegments.forEach(function(complexSegment){

    if (complexSegment.path.length > path) return; //complex segment is *my/test*/complex/segment* and path is my/test

    if (_this.__wildcardMatch(complexSegment.path, path)){

      Object.keys(complexSegment.recipients).forEach(function(recipientKey){
        recipients.push(complexSegment.recipients[recipientKey]);
      });
    };
  });
};

PareTree.prototype.search = function (path, excludeAll) {

  var recipients = this.__cache.get(path);

  if (recipients != null) return recipients;

  else recipients = [];

  this.__searchAndAppendPrecise(path, recipients);

  this.__searchAndAppendWildcardRight(path, recipients);

  this.__searchAndAppendWildcardLeft(path, recipients);

  this.__searchAndAppendWildcardComplex(path, recipients);

  if (!excludeAll) this.__searchAndAppendAll(recipients);

  this.__cache.set(path, recipients);

  return recipients;
};

module.exports = PareTree;


