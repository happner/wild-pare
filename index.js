module.exports = PareTree;

var LRU = require("lru-cache");
var BinarySearchTree = require('./lib/binary-search-tree');
var uniqid = require('./lib/id').create();
var sift = require('sift');
var Comedian = require('co-median');

PareTree.prototype.add = add;
PareTree.prototype.search = search;
PareTree.prototype.remove = remove;

PareTree.prototype.__initialize = __initialize;
PareTree.prototype.__segmentPath = __segmentPath;
PareTree.prototype.__wildcardMatch = __wildcardMatch;
PareTree.prototype.__decouple = __decouple;
PareTree.prototype.__clone = __clone;
PareTree.prototype.__endsWith = __endsWith;
PareTree.prototype.__largerEndsWith = __largerEndsWith;
PareTree.prototype.__largerStartsWith = __largerStartsWith;
PareTree.prototype.__addSubscription = __addSubscription;

PareTree.prototype.__appendRecipients = __appendRecipients;

PareTree.prototype.__appendRecipientsBC = __appendRecipientsBC;

PareTree.prototype.__appendRecipientsC = __appendRecipientsC;

PareTree.prototype.__appendRecipientsLL = __appendRecipientsLL;
PareTree.prototype.__appendRecipientsLR = __appendRecipientsLR;
PareTree.prototype.__appendRecipientsLP = __appendRecipientsLP;

PareTree.prototype.__appendRecipientsRR = __appendRecipientsRR;
PareTree.prototype.__appendRecipientsRL = __appendRecipientsRL;
PareTree.prototype.__appendRecipientsRP = __appendRecipientsRP;

PareTree.prototype.__appendRecipientsPL = __appendRecipientsPL;
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

  this.__comedian = new Comedian(this.options.wildcardCache);

  this.__initialize();
}


PareTree.prototype.BRANCH = {
  ALL: -1,
  PRECISE: 0,
  WILDCARD_LEFT: 1,
  WILDCARD_RIGHT: 2,
  WILDCARD_COMPLEX: 3
};


function add(path, recipient) {

  if (recipient == null) throw new Error('no recipient for subscription');

  if (recipient.substring) recipient = {
    key: recipient
  };

  var segment = this.__segmentPath(path);

  if (segment.branch === this.BRANCH.ALL) return this.__wildcardAllRecipients.push(recipient);

  return this.__addSubscription(path, segment, recipient);
}

function search(path, options) {
  //[start:{"key":"search"}:start]

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

  if (segment.branch == this.BRANCH.WILDCARD_COMPLEX) this.__appendRecipientsC(path, recipients);
  else {

    this.__appendRecipients(segment, this.BRANCH.WILDCARD_LEFT, recipients);
    this.__appendRecipients(segment, this.BRANCH.WILDCARD_RIGHT, recipients);
    this.__appendRecipients(segment, this.BRANCH.WILDCARD_COMPLEX, recipients);
    this.__appendRecipients(segment, this.BRANCH.PRECISE, recipients);
  }

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

  var removed = [];

  if (options == null) throw new Error('invalid remove options: options cannot be null');

  if (options.substring) options = {
    path: options
  };

  if (options.id) {

    var specific = this.__removeSpecific(options);
    if (specific != null) removed.push(specific);
    return removed;
  }

  else if (options.path) return this.__removeByPath(options);

  else throw new Error('invalid remove options: ' + JSON.stringify(options));
}

function __initialize() {

  this.__cache.reset();

  this.__trunk = Object.create({});

  this.__trunk[this.BRANCH.WILDCARD_COMPLEX] = BinarySearchTree.create();

  this.__trunk[this.BRANCH.WILDCARD_LEFT] = BinarySearchTree.create();

  this.__trunk[this.BRANCH.WILDCARD_RIGHT] = BinarySearchTree.create();

  this.__trunk[this.BRANCH.PRECISE] = BinarySearchTree.create();

  this.__allRecipients = new Array();

  this.__wildcardAllRecipients = new Array();
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

  var reference = {id: uniqid(), data:recipient.data, key:recipient.key, path:path};

  existingRecipient.references.insert(reference.id, reference);

  this.__allRecipients.push(reference);

  //[end:{"key":"__addSubscription"}:end]

  return reference;
}

function __appendRecipients(segment, branchType, recipients){

  //[start:{"key":"__appendRecipients"}:start]

  switch (segment.branch){

    case this.BRANCH.WILDCARD_LEFT:

      switch (branchType) {

        case this.BRANCH.WILDCARD_LEFT:
          return this.__appendRecipientsLL(segment, recipients);

        case this.BRANCH.WILDCARD_RIGHT:
          return this.__appendRecipientsLR(segment, recipients);

        case this.BRANCH.PRECISE:
          return this.__appendRecipientsLP(segment, recipients);

        case this.BRANCH.WILDCARD_COMPLEX:
          return this.__appendRecipientsBC(this.BRANCH.WILDCARD_LEFT, segment, recipients);

      } break;

    case this.BRANCH.WILDCARD_RIGHT:

      switch (branchType) {

        case this.BRANCH.WILDCARD_LEFT:
          return this.__appendRecipientsRL(segment, recipients);

        case this.BRANCH.WILDCARD_RIGHT:
          return this.__appendRecipientsRR(segment, recipients);

        case this.BRANCH.PRECISE:
          return this.__appendRecipientsRP(segment, recipients);

        case this.BRANCH.WILDCARD_COMPLEX:
          return this.__appendRecipientsBC(this.BRANCH.WILDCARD_RIGHT, segment, recipients);

      } break;

    case this.BRANCH.PRECISE:

      switch (branchType) {

        case this.BRANCH.WILDCARD_LEFT:
          return this.__appendRecipientsPL(segment, recipients);

        case this.BRANCH.WILDCARD_RIGHT:
          return this.__appendRecipientsPR(segment, recipients);

        case this.BRANCH.PRECISE:
          return this.__appendRecipientsPP(segment, recipients);

        case this.BRANCH.WILDCARD_COMPLEX:
          return this.__appendRecipientsBC(this.BRANCH.PRECISE, segment, recipients);

      } break;
  }

  //[end:{"key":"__appendRecipients"}:end]
}

function __endsWith(str1, str2) {

  if (str1 == null ||
    str2 == null ||
    str1.substring == null ||
    str2.substring == null ||
    str2.length > str1.length) return false;

  return str1.substring(str1.length - str2.length) == str2;
}

//loops through a specified branch type, does complex matches to segment
function __appendRecipientsBC(branchType, segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsBC"}:start]

  this.__trunk[self.BRANCH.WILDCARD_COMPLEX].allValues(false, true).forEach(function(branch){

    branch.value.segments.allValues(false, true).forEach(function(branchSegment){

      var segmentPath = segment.key;

      if (branchType == self.BRANCH.WILDCARD_LEFT) segmentPath = '*' + segmentPath;

      if (branchType == self.BRANCH.WILDCARD_RIGHT) segmentPath = segmentPath + '*';

      if (!self.__wildcardMatch(segmentPath, branchSegment.value.key)) return;

      self.__appendReferences(branchSegment.value, recipients);
    });
  });

  //[end:{"key":"__appendRecipientsBC"}:end]
}

function __appendRecipientsC(path, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsC"}:start]

  this.__allRecipients.forEach(function(reference){
    if (self.__wildcardMatch(path, reference.path)) recipients.push(reference);
  });

  //[end:{"key":"__appendRecipientsC"}:end]
}

// *test *est
function __appendRecipientsLL(segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsLL"}:start]

  this.__trunk[this.BRANCH.WILDCARD_LEFT].allValues().forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (!self.__largerEndsWith(branchSegment.value.key, segment.key)) return;

      self.__appendReferences(branchSegment.value, recipients);
    });
  });

  //[end:{"key":"__appendRecipientsLL"}:end]
}

// *testi blahtest*
function __appendRecipientsLR(segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsLR"}:start]

  this.__trunk[this.BRANCH.WILDCARD_RIGHT].allValues().forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (!self.__wildcardMatch(branchSegment.value.key + '*', segment.path)) return;

      self.__appendReferences(branchSegment.value, recipients);
    });
  });

  //[end:{"key":"__appendRecipientsLR"}:end]
}

// ie: *test blahtest
function __appendRecipientsLP(segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsLP"}:start]

  this.__trunk[this.BRANCH.PRECISE].betweenBounds({ $gte: segment.key.length}).forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (!self.__endsWith(branchSegment.value.key, segment.key)) return;

      self.__appendReferences(branchSegment.value, recipients);
    });
  });

  //[end:{"key":"__appendRecipientsLP"}:end]
}

function __appendRecipientsRL(segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsRL"}:start]

  this.__trunk[this.BRANCH.WILDCARD_LEFT].allValues().forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (!self.__wildcardMatch('*' + branchSegment.value.key, segment.path)) return;

      self.__appendReferences(branchSegment.value, recipients);
    });
  });

  //[end:{"key":"__appendRecipientsRL"}:end]
}

function __appendRecipientsRR(segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsRR"}:start]

  this.__trunk[this.BRANCH.WILDCARD_RIGHT].allValues().forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (!self.__largerStartsWith(branchSegment.value.key, segment.key)) return;

      self.__appendReferences(branchSegment.value, recipients);
    });
  });

  //[end:{"key":"__appendRecipientsRR"}:end]
}

function __appendRecipientsRP(segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsRP"}:start]

  this.__trunk[this.BRANCH.PRECISE].betweenBounds({ $gte: segment.key.length}).forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (branchSegment.value.key.indexOf(segment.key) != 0) return;

      self.__appendReferences(branchSegment.value, recipients);
    });
  });

  //[end:{"key":"__appendRecipientsRP"}:end]
}

function __appendRecipientsPL(segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsPL"}:start]

  this.__trunk[this.BRANCH.WILDCARD_LEFT].betweenBounds({ $lte: segment.path.length}).forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (!self.__endsWith(segment.path, branchSegment.value.key)) return;

      self.__appendReferences(branchSegment.value, recipients);
    });
  });

  //[end:{"key":"__appendRecipientsPL"}:end]
}

function __appendRecipientsPR(segment, recipients){

  var self = this;

  //[start:{"key":"__appendRecipientsPR"}:start]

  this.__trunk[this.BRANCH.WILDCARD_RIGHT].betweenBounds({ $lte: segment.path.length }).forEach(function(branch){

    branch.segments.allValues(false, true).forEach(function(branchSegment){

      if (segment.path.indexOf(branchSegment.value.key) != 0) return;

      self.__appendReferences(branchSegment.value, recipients);
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

function __appendReferences(branchSegment, recipients){

  //[start:{"key":"__appendReferences"}:start]

  branchSegment.subscriptions.allValues(false, true).forEach(function(subscription){

    subscription.value.recipients.allValues(false, true).forEach(function(recipient){

      recipient.value.references.allValues(false, true).forEach(function(reference){
        recipients.push(reference);
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

    if (pathSegments.length > 2) segment.branch = this.BRANCH.WILDCARD_COMPLEX;

    else {

      if (segment.pathRightEnd == '*' && segment.pathLeftEnd != '*') {
        segment.branch = this.BRANCH.WILDCARD_RIGHT;
        segment.key = pathSegments[pathSegments.length - 2];
      }

      if (segment.pathRightEnd != '*' && segment.pathLeftEnd == '*') {
        segment.branch = this.BRANCH.WILDCARD_LEFT;
        segment.key = pathSegments[1];
      }
    }
  }
  return segment;
}

function __largerEndsWith(str1, str2){

  return ((str1 <= str2 && this.__endsWith(str2, str1)) || (str1 > str2 && this.__endsWith(str1, str2)))
}

function __largerStartsWith(str1, str2){

  return ((str1 <= str2 && str2.indexOf(str1) == 0) ||
    (str1 > str2 && str1.indexOf(str2) == 0))
}

function __wildcardMatch(path1, path2) {

  //[start:{"key":"__wildcardMatch"}:start]

  var match = this.__comedian.matches(path1, path2);

  //[end:{"key":"__wildcardMatch"}:end]

  return match;
}

function __decouple(results) {

  var self = this;

  return results.map(function (result) {
    return self.__clone(result);
  });
}

function __clone(obj){

  return JSON.parse(JSON.stringify(obj));
}