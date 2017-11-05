module.exports = PareTree;

var LRU = require("lru-cache");
var BinarySearchTree = require('./lib/binary-search-tree');
var uniqid = require('./lib/id').create();
var sift = require('sift');
var micromatch = require('micromatch');
var isGlob = require('is-glob');

PareTree.prototype.add = add;
PareTree.prototype.search = search;
PareTree.prototype.remove = remove;

PareTree.prototype.__initialize = __initialize;
PareTree.prototype.__segmentPath = __segmentPath;
PareTree.prototype.__wildcardMatch = __wildcardMatch;
PareTree.prototype.__decouple = __decouple;

PareTree.prototype.__removeById = __removeById;
PareTree.prototype.__removeByPath = __removeByPath;
PareTree.prototype.__removeBySubscriberKey = __removeBySubscriberKey;
PareTree.prototype.__removeByPathAndSubscriberKey = __removeByPathAndSubscriberKey;
PareTree.prototype.__removeById = __removeById;
PareTree.prototype.__pruneBranch = __pruneBranch;
PareTree.prototype.__pruneAllRecipients = __pruneAllRecipients;
PareTree.prototype.__pruneAllWildcardRecipients = __pruneAllWildcardRecipients;
PareTree.prototype.__addAllRecipient = __addAllRecipient;

PareTree.prototype.__clone = __clone;
PareTree.prototype.__addSubscription = __addSubscription;
PareTree.prototype.__checkPath = __checkPath;

PareTree.prototype.__appendRecipients = __appendRecipients;
PareTree.prototype.__appendRecipientsPR = __appendRecipientsPR;
PareTree.prototype.__appendRecipientsPP = __appendRecipientsPP;

PareTree.prototype.__appendReferences = __appendReferences;

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


PareTree.prototype.BRANCH = {
  ALL: -1,
  PRECISE: 0,
  WILDCARD: 1
};

function __checkPath(path){

  if (path == null) throw new Error('path cannot be null');

  var stripped = '';

  var lastChar = null;

  for (var i = 0; i < path.length; i++) {

    if (path[i] == '*' && lastChar == '*') continue;

    stripped += path[i];

    lastChar = path[i];
  }

  //no */test/paths
  if (stripped[0] == '*' && stripped.length > 1) throw new Error('path can only have right hand sided wildcards, only /test/**, not **/test');
}

function add(path, recipient) {

  this.__checkPath(path);

  if (recipient == null) throw new Error('no recipient for subscription');

  if (recipient.substring) recipient = {
    key: recipient
  };

  var segment = this.__segmentPath(path);

  if (segment.branch === this.BRANCH.ALL) return this.__addAllRecipient(recipient);

  return this.__addSubscription(path, segment, recipient);
}

function search(path, options) {
  //[start:{"key":"search"}:start]

  if (!options) options = {};

  if (!options.exact && isGlob(path)) throw new Error('glob searches are not allowed unless options.exact is true (globs are ignored both sides)');

  if (options == null) options = {};

  if (path.path) {
    options = path;
    path = path.path
  }

  if (options.filter) {
    options.postFilter = options.filter;
    delete options.filter;
  }

  //cache key is comprised of the path, and the options stringified,
  // so we dont cache something that has been filtered and then
  // do a search without a filter and get the filtered data

  var cacheKey = path + JSON.stringify(options);

  var recipients = this.__cache.get(cacheKey);

  if (recipients != null) return recipients;

  else recipients = [];

  var segment = this.__segmentPath(path);

  this.__appendRecipients(segment, recipients, options.exact);

  if (!options.excludeAll) this.__wildcardAllRecipients.forEach(function(allRecipient){
    recipients.push(allRecipient);
  });

  if (options.postFilter) recipients = sift(options.postFilter, recipients);

  this.__cache.set(cacheKey, recipients);

  if (options.decouple) recipients = this.__decouple(recipients);

  //[end:{"key":"search"}:end]

  return recipients;
}

function remove(options) {

  if (options == null) throw new Error('invalid remove options: options cannot be null');

  if (options.substring) options = {
    path: options
  };

  if (options.id){
    var removed = this.__removeById(options.id);
    if (removed == null) return [];
    return [removed];
  }

  if (options.path && options.key) return this.__removeByPathAndSubscriberKey(options.path, options.key);

  if (options.path) return this.__removeByPath(options.path);

  if (options.key) return this.__removeBySubscriberKey(options.key);

  throw new Error("invalid remove options: options must have a subscription 'id', subscriber 'key' or 'path' property");
}

function __addAllRecipient(recipient){

  var reference = {id: uniqid(), data:recipient.data, key:recipient.key, path:'*'};

  this.__wildcardAllRecipients.push(reference);

  return reference;
}

function __pruneBranch(reference){

  var self = this;

  var branch = self.__trunk[reference.branch].search(reference.segment.length)[0];

  if (!branch) return;

  var branchSegment = branch.segments.search(reference.segment)[0];

  if (!branchSegment) return;

  var subscription = branchSegment.subscriptions.search(reference.path)[0];

  if (!subscription) return;

  var existingRecipient = subscription.recipients.search(reference.key)[0];

  if (!existingRecipient) return;

  var existingReference = existingRecipient.references.search(reference.id)[0];

  if (existingReference) {

    existingRecipient.references.delete(reference.id);

    if (existingRecipient.references.allValues(false, true).length == 0){

      subscription.recipients.delete(reference.key);

      if (subscription.recipients.allValues(false, true).length == 0){

        branchSegment.subscriptions.delete(reference.path);

        if (branchSegment.subscriptions.allValues(false, true).length == 0){

          branch.segments.delete(reference.segment);

          if (branch.segments.allValues(false, true).length == 0){

            self.__trunk[reference.branch].delete(reference.segment.length);
          }
        }
      }
    }
  }
}

function __pruneAllRecipients(removeIndexes){

  var self = this;

  removeIndexes.reverse();

  removeIndexes.forEach(function(removeAt){
    self.__allRecipients.splice(removeAt, 1);
  });
}

function __pruneAllWildcardRecipients(removeIndexes){

  var self = this;

  removeIndexes.reverse();

  removeIndexes.forEach(function(removeAt){
    self.__wildcardAllRecipients.splice(removeAt, 1);
  });
}

function __removeById(id){

  var self = this;

  var removeIndex = -1;
  var removed = null;

  self.__allRecipients.every(function(reference, referenceIndex){

    if (reference.id == id){

      removeIndex = referenceIndex;

      self.__pruneBranch(reference);

      removed = reference;

      return false;//found what we were looking for, moving on
    }
    return true;
  });

  if (removed) {

    self.__pruneAllRecipients([removeIndex]);
    self.__cache.reset();

    return removed;
  }

  self.__wildcardAllRecipients.every(function(reference, referenceIndex){

    if (reference.id == id){

      removeIndex = referenceIndex;

      removed = reference;

      return false;//found what we were looking for, moving on
    }
    return true;
  });

  if (removed){
    self.__pruneAllWildcardRecipients([removeIndex]);
    self.__cache.reset();
  }

  return removed;
}

function __removeBySubscriberKey(key){

  var self = this;

  var removeIndexes = [];
  var removed = [];

  self.__allRecipients.forEach(function(reference, referenceIndex){

    if (reference.key == key){

      removeIndexes.push(referenceIndex);

      self.__pruneBranch(reference);

      removed.push(reference);
    }
  });

  if (!removed.length) return [];

  self.__pruneAllRecipients(removeIndexes);

  self.__cache.reset();

  return removed;
}

function __removeByPath(path){

  var self = this;

  var removed = [];

  var options = {exact:path};

  if (path != '*') options.excludeAll = true;

  self.search(path, options).forEach(function(reference){

    removed.push(self.__removeById(reference.id));
  });

  self.__cache.reset();

  return removed;
}

function __removeByPathAndSubscriberKey(path, key){

  var self = this;

  var removed = [];

  var options = {filter:{key:key}, excludeAll:true, exact:path};

  self.search(path, options).forEach(function(reference){

    removed.push(self.__removeById(reference.id));
  });

  self.__cache.reset();

  return removed;
}

function __initialize() {

  this.__cache.reset();

  this.__trunk = Object.create({});

  this.__trunk[this.BRANCH.WILDCARD] = BinarySearchTree.create();

  this.__trunk[this.BRANCH.PRECISE] = BinarySearchTree.create();

  this.__allRecipients = [];

  this.__wildcardAllRecipients = [];
}

function __addSubscription(path, segment, recipient) {

  //[start:{"key":"__addSubscription"}:start]

  var branch = this.__trunk[segment.branch].search(segment.key.length)[0];

  if (branch == null) {

    branch = {
      size: segment.key.length,
      segments: new BinarySearchTree()
    };

    this.__trunk[segment.branch].insert(segment.key.length, branch);
  }

  var branchSegment = branch.segments.search(segment.key)[0];

  if (branchSegment == null) {

    branchSegment = {
      key:segment.key,
      subscriptions: new BinarySearchTree()
    };

    branch.segments.insert(segment.key, branchSegment);
  }

  var subscription = branchSegment.subscriptions.search(path)[0];

  if (!subscription) {

    subscription = {
      path: path,
      recipients: new BinarySearchTree()
    };

    branchSegment.subscriptions.insert(path, subscription)
  }

  var existingRecipient = subscription.recipients.search(recipient.key)[0];

  if (existingRecipient == null) {

    existingRecipient = this.__clone(recipient);
    existingRecipient.references = new BinarySearchTree();

    subscription.recipients.insert(recipient.key, existingRecipient);
  }

  var reference = {id: uniqid(), data:recipient.data, key:recipient.key, path:path, segment:segment.key, branch:segment.branch};

  existingRecipient.references.insert(reference.id, reference);

  this.__allRecipients.push(reference);

  //[end:{"key":"__addSubscription"}:end]

  return reference;
}

function __appendRecipients(segment, recipients, exact){

  //[start:{"key":"__appendRecipients"}:start]

  this.__appendRecipientsPR(segment, recipients, exact);

  this.__appendRecipientsPP(segment, recipients);

  //[end:{"key":"__appendRecipients"}:end]
}

function __appendRecipientsPR(segment, recipients, exact){

  var self = this;

  //[start:{"key":"__appendRecipientsPR"}:start]

  this.__trunk[this.BRANCH.WILDCARD].betweenBounds({ $lte: segment.path.length }).forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (segment.path.indexOf(branchSegment.value.key) != 0) return;

      self.__appendReferences(branchSegment.value, recipients, segment.path, exact);
    });
  });

  //[end:{"key":"__appendRecipientsPR"}:end]
}

function __appendRecipientsPP(segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsPP"}:start]

  this.__trunk[this.BRANCH.PRECISE].betweenBounds({ $eq: segment.path.length }).forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (branchSegment.value.key != segment.path) return;

      self.__appendReferences(branchSegment.value, recipients);
    });
  });

  //[end:{"key":"__appendRecipientsPP"}:end]
}

function __appendReferences(branchSegment, recipients, matchTo, exact){

  //[start:{"key":"__appendReferences"}:start]

  var self = this;

  branchSegment.subscriptions.allValues(false, true).forEach(function(subscription){

    subscription.value.recipients.allValues(false, true).forEach(function(recipient){

      recipient.value.references.allValues(false, true).forEach(function(reference){
        //console.log('matchTo:::', matchTo, reference);
        if (exact && reference.value.path != exact) return;
        if (matchTo && !self.__wildcardMatch(matchTo, reference.value.path)) return;
        recipients.push(reference.value);
      });
    });
  });

  //[end:{"key":"__appendReferences"}:end]
}

function __segmentPath(path) {

  var pathSegments = path.split('*');

  var segment = {
    branch: this.BRANCH.PRECISE,
    key: path,
    pathRightEnd: path.substring(path.length - 1, path.length),
    pathLeftEnd: path.substring(0, 1),
    wildcardIndex: path.indexOf('*'),
    path:path //used by the search
  };

  if (path.replace(/[*]/g, '') == '') segment.branch = this.BRANCH.ALL;

  else {

    if (segment.wildcardIndex === -1) return segment; //a precise segment

    segment.branch = this.BRANCH.WILDCARD;
    segment.key = pathSegments[0];
  }
  return segment;
}

function __wildcardMatch(str, pattern) {

  //[start:{"key":"__wildcardMatch"}:start]

  return micromatch.isMatch(str, pattern);

  //[end:{"key":"__wildcardMatch"}:end]
}

function __decouple(results) {

  return this.__clone(results);
}

function __clone(obj){

  return JSON.parse(JSON.stringify(obj));
}