describe('func wild pare', function () {

  this.timeout(5000);

  var expect = require('expect.js');

  var shortid = require('shortid');

  var random = require('./fixtures/random');

  var PareTree = require('..');

  var VERBOSE = true;

  var testLog = function (message, object) {
    if (VERBOSE) {
      console.log(message);
      if (object) console.log(JSON.stringify(object, null, 2));
    }
  };


  it('gets the largest contiguous section', function (done) {

    var pareTree = new PareTree();

    var testPath = "*a/testsegment*smallest/*smallerthan*";

    var largestContiguous = pareTree.__getLargestContiguous({
      pathSegments:testPath.split('*')
    });

    expect(largestContiguous).to.be('a/testsegment');

    done();
  });

  it('segments the 4 types of path', function (done) {

    var pareTree = new PareTree();

    var allSegment = pareTree.__segmentPath('*');

    var leftSegment = pareTree.__segmentPath('*/left/path');

    var rightSegment = pareTree.__segmentPath('right/path/*');

    var leftComplexSegment = pareTree.__segmentPath('*complex*/left/path');

    var rightComplexSegment = pareTree.__segmentPath('right/path/*complex*');

    var complexSegment = pareTree.__segmentPath('*a/complex/segment*');

    var anotherComplexSegment = pareTree.__segmentPath('*another/complex/segment*with/2/sections*');

    expect(allSegment.type).to.be(pareTree.SEGMENT_TYPE.ALL);

    expect(leftSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_LEFT);

    expect(rightSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_RIGHT);

    expect(leftComplexSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_LEFT);

    expect(rightComplexSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_RIGHT);

    expect(complexSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX);

    expect(anotherComplexSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX);

    expect(leftSegment.segmentPath).to.be('/left/path');

    expect(rightSegment.segmentPath).to.be('right/path/');

    expect(leftSegment.complex).to.be(false);

    expect(rightSegment.complex).to.be(false);

    expect(complexSegment.segmentPath).to.be('a/complex/segment');

    expect(anotherComplexSegment.segmentPath).to.be('another/complex/segment');

    expect(leftComplexSegment.complex).to.be(true);

    expect(rightComplexSegment.complex).to.be(true);

    expect(complexSegment.complex).to.be(true);

    expect(anotherComplexSegment.complex).to.be(true);

    done();

  });



  it('adds an all subscription', function (done) {

    var pareTree = new PareTree();

    var subscriptions = [];

    pareTree.__appendQueryRecipient({
      refCount:1,
      key:'testKey',
      subscriptions:[
        {id:'testId1', data:{test:'data1'}}
      ]
    }, subscriptions);

    pareTree.__appendQueryRecipient({
      refCount:2,
      key:'testKey',
      subscriptions:[
        {id:'testId2', data:{other:'data'}},
        {id:'testId3', data:{different:'data'}}
      ]
    }, subscriptions);

    expect(subscriptions.length).to.be(3);

    expect(subscriptions[0].data).to.eql({test:'data1'});
    expect(subscriptions[1].data).to.eql({other:'data'});
    expect(subscriptions[2].data).to.eql({different:'data'});

    expect(subscriptions[0].key).to.be('testKey');
    expect(subscriptions[1].key).to.be('testKey');
    expect(subscriptions[2].key).to.be('testKey');

    expect(subscriptions[0].id).to.be('testId1');
    expect(subscriptions[1].id).to.be('testId2');
    expect(subscriptions[2].id).to.be('testId3');

    done();
  });

  it('adds an all subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('*');

    var recipient = 'test-all-recipient';

    pareTree.__addAll(segmented, {key:recipient, data:'test'});

    expect(pareTree.__allCount).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppendAll(recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    done();

  });

  it('tests adding a subscription id and pushing the path data to an internal index', function(){

  });

  it('tests doing a wildcard search', function(){

    //we create a bunch of subscriptions, thn search using a wildcard
    //NB - this functionality makes permissions, and deep searching possible, ie: /wild/* and /wild/card/* in /wi*

  });

  //mmmmm

  var __appendRecipients = function (path, segmentPath, branch, subscriptions) {

    var _this = this;

    var existingSegments = branch.segments.search(segmentPath);

    existingSegments.forEach(function(segment){

      if ( (segment.type === _this.SEGMENT_TYPE.WILDCARD_COMPLEX && path.indexOf(segmentPath) > -1)
        || (segment.type === _this.SEGMENT_TYPE.WILDCARD_RIGHT && path.indexOf(segmentPath) == 0)
        || (segment.type === _this.SEGMENT_TYPE.WILDCARD_LEFT && path.substring(path.length - segmentPath.length, path.length) == segmentPath)
      )
        segment.recipients.forEach(function(recipient){

          if ((recipient.complex && _this.__wildcardMatch(recipient.path, path) == false) return;

          _this.__appendQueryRecipient(recipient, subscriptions);
        });
    });
  };

  it('adds a left wildcard subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('*/a/wildcard/left');

    var recipient = 'test-wildcard-left-recipient';

    pareTree.__addSubscription(segmented, {key:recipient, data:'test'});

    expect(pareTree.__wildcardCount).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppendWildcardLeft('test/a/wildcard/left', recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    done();

  });

});
