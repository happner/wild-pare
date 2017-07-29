describe('functional tests wild pare', function () {

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

  it('tests wildcard matching', function (done) {

    var pareTree = new PareTree();

    expect(pareTree.__wildcardMatch('/test/complex/*/short','/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/*','/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/*/*/short','/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test*','/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('*/short','/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test*/short','/test/complex/and/short')).to.be(true);

    expect(pareTree.__wildcardMatch('/test/complex/*/short','/test/complex/and/long')).to.be(false);
    expect(pareTree.__wildcardMatch('/test/complex/*','/blah/complex/and/short')).to.be(false);
    expect(pareTree.__wildcardMatch('/test/*/*/short','/test/complex/and/long')).to.be(false);
    expect(pareTree.__wildcardMatch('/test*','/tes/complex/and/short')).to.be(false);
    expect(pareTree.__wildcardMatch('*/short','/test/complex/and/long')).to.be(false);
    expect(pareTree.__wildcardMatch('/test*/short','/test/complex/and/short/')).to.be(false);

    //left right

    // expect(pareTree.__wildcardMatch('*hort','/short*')).to.be(true);
    //left left
    // expect(pareTree.__wildcardMatch('*hort','*/complex/short')).to.be(true);
    //left precise
    // expect(pareTree.__wildcardMatch('*hort','*/complex/short')).to.be(true);
    //left complex
    //expect(pareTree.__wildcardMatch('*hort','*/complex/short')).to.be(true);


    // expect(pareTree.__wildcardMatch('*/short','*/complex/and/short')).to.be(true);
    // expect(pareTree.__wildcardMatch('/test/complex/*','/test/comp*')).to.be(true);
    // expect(pareTree.__wildcardMatch('/test/*/*/short','/test*short')).to.be(true);
    // expect(pareTree.__wildcardMatch('/test*','*test/com*')).to.be(true);

    done();

  });

  it('tests the sorted object array', function (done) {

    var SortedObjectArray = require("../lib/sorted-array");

    var testSorted = new SortedObjectArray('size');

    var testRandomFirstIndexes = {};

    var index = 0;

    var TESTCOUNT = 20;

    var RANDOM_MAX = 10;

    for (var i = 0; i < TESTCOUNT; i++){

      var last = random.integer(1, RANDOM_MAX);

      for (var ii = 0; ii < last; ii++){

        var randomStrings = random.string({length:20, count:last});

        index++;

        if (ii == 0) testRandomFirstIndexes[i] = last;

        testSorted.insert({size:i, subkey:randomStrings[ii]});
      }
    }

    Object.keys(testRandomFirstIndexes).forEach(function(key){

      var searchedItems = testSorted.search(key);
      expect(searchedItems.length).to.be(testRandomFirstIndexes[key]);
    });

    var removeAllKey;
    var removeAtKey;
    var removeAtSubkey;

    Object.keys(testRandomFirstIndexes).every(function(key){

      var searchedItems = testSorted.search(key);

      if (searchedItems.length > 1 && removeAllKey != null && removeAtKey == null){
        removeAt = searchedItems[0];
        removeAtKey = key;
        removeAtSubkey = searchedItems[0].subkey;
        return false;
      }
      if (searchedItems.length > 1 && removeAllKey == undefined && key != removeAtKey) {
        removeAllKey = key;
      }
      return true;
    });


    var foundAll = testSorted.search(removeAllKey);

    expect(foundAll.length > 0).to.be(true);

    var removeAllResult = testSorted.remove(removeAllKey);

    var foundAll = testSorted.search(removeAllKey);

    expect(foundAll.length).to.be(0);

    var foundAtCount = testSorted.search(removeAtKey).length;

    var removeAtResult = testSorted.remove(removeAtKey, {'subkey':{$eq:removeAtSubkey}});

    var foundAtCountAfterRemove = testSorted.search(removeAtKey).length;

    expect(foundAtCount - 1).to.be(foundAtCountAfterRemove);

    done();

  });

  it('tests the permutate function', function (done) {

    var pareTree = new PareTree();

    //var mutations = pareTree.__permutate('simon', pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX);

    pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_LEFT] = 1;

    var mutations = pareTree.__permutate('/a/very/long/path/simon', pareTree.SEGMENT_TYPE.WILDCARD_LEFT);

    expect(mutations.length).to.be(23);

    pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_RIGHT] = 1;

    pareTree.__upperBounds[pareTree.SEGMENT_TYPE.WILDCARD_RIGHT] = '/a/very/long/path/simon'.length;

    var mutations = pareTree.__permutate('/a/very/long/path/simon', pareTree.SEGMENT_TYPE.WILDCARD_RIGHT);

    expect(mutations.length).to.be(23);

    done();
  });

  // it('gets the largest contiguous section', function (done) {
  //
  //   var pareTree = new PareTree();
  //
  //   var testPath = "*a/testsegment*smallest/*smallerthan*";
  //
  //   var largestContiguous = pareTree.__getLargestContiguous({
  //     pathSegments:testPath.split('*')
  //   });
  //
  //   expect(largestContiguous).to.be('a/testsegment');
  //
  //   done();
  // });

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

    expect(leftComplexSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX);

    expect(rightComplexSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX);

    expect(complexSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX);

    expect(anotherComplexSegment.type).to.be(pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX);

    expect(leftSegment.segmentPath).to.be('/left/path');

    expect(rightSegment.segmentPath).to.be('right/path/');

    expect(complexSegment.segmentPath).to.be('a/complex/segment');

    expect(anotherComplexSegment.segmentPath).to.be('another/complex/segment');

    done();

  });

  it('adds an all subscription', function (done) {

    var pareTree = new PareTree();

    var subscriptions = [];

    pareTree.__appendQueryRecipient({
      key:'testKey',
      subscriptions:[
        {id:'testId1', data:{test:'data1'}}
      ]
    }, '*/test/path', subscriptions, pareTree.SEGMENT_TYPE.WILDCARD_LEFT);

    pareTree.__appendQueryRecipient({
      refCount:2,
      key:'testKey',
      subscriptions:[
        {id:'testId2', data:{other:'data'}},
        {id:'testId3', data:{different:'data'}}
      ]
    },  '/test/path/*', subscriptions, pareTree.SEGMENT_TYPE.WILDCARD_RIGHT);

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

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.ALL]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend({path:'*'}, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    done();

  });

  it('adds a left wildcard subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('*/a/wildcard/left');

    var recipient = 'test-wildcard-left-recipient';

    pareTree.__addSubscription(segmented, {key:recipient, data:'test'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_LEFT]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend({path:'test/a/wildcard/left'}, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    done();

  });

  it('adds a right wildcard subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('/a/wildcard/right/*');

    var recipient = 'test-wildcard-right-recipient';

    pareTree.__addSubscription(segmented, {key:recipient, data:'test'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_RIGHT]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend({path:'/a/wildcard/right/test'}, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    done();

  });

  it('adds a complex wildcard subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('*/a/wildcard/complex/*');

    var recipient = 'test-wildcard-complex-recipient';

    pareTree.__addSubscription(segmented, {key:recipient, data:'test-complex'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend({path:'doing/a/wildcard/complex/test'}, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test-complex');

    expect(recipients[0].key).to.be('test-wildcard-complex-recipient');

    done();
  });

  it('adds and removes a left wildcard subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('*/a/wildcard/left');

    var recipient = 'test-wildcard-left-recipient';

    var subscriptionReference = pareTree.__addSubscription(segmented, {key:recipient, data:'test'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_LEFT]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend({path:'test/a/wildcard/left'}, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_LEFT]).to.be(0);

    done();

  });

  it('adds and removes a right wildcard subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('/a/wildcard/right/*');

    var recipient = 'test-wildcard-right-recipient';

    var subscriptionReference = pareTree.__addSubscription(segmented, {key:recipient, data:'test'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_RIGHT]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend({path:'/a/wildcard/right/test'}, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_RIGHT]).to.be(0);

    done();

  });

  it('adds and removes a complex wildcard subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('*/a/wildcard/complex/*');

    var recipient = 'test-wildcard-complex-recipient';

    var subscriptionReference = pareTree.__addSubscription(segmented, {key:recipient, data:'test-complex'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend({path:'doing/a/wildcard/complex/test'}, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test-complex');

    expect(recipients[0].key).to.be('test-wildcard-complex-recipient');

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX]).to.be(0);

    done();
  });

  it('adds and removes an all subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('*');

    var recipient = 'test-all-recipient';

    var subscriptionReference = pareTree.__addAll(segmented, {key:recipient, data:'test'});

    var recipient1 = 'test-all-recipient1';

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.ALL]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend({path:'*'}, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    expect(Object.keys(pareTree.__trunkAll.recipients).length).to.be(1);

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.ALL]).to.be(0);

    expect(Object.keys(pareTree.__trunkAll.recipients).length).to.be(0);

    done();
  });

  it('tests the wildcard search matching, where * is nothing', function(done){
    var pareTree = new PareTree();
    expect(pareTree.__wildcardMatch('*te*st/mat', '*te*st*')).to.be(true);
    done();
  });

  it('tests the wildcard search matching, where * take place of actual characters', function(done){

    var pareTree = new PareTree();

    //expect(pareTree.__wildcardSearchMatch('*', '*te*st*')).to.be(true);

    // expect(pareTree.__wildcardSearchMatch('*test/mat', '*te*st*')).to.be(true);
    //
    // expect(pareTree.__wildcardSearchMatch('*te*st*', '*test/mat')).to.be(true);
    //
    // expect(pareTree.__wildcardSearchMatch('*te*s*t*', '*test/mat')).to.be(true);

    expect(pareTree.__wildcardMatch('*e*ma*', '*test/mat')).to.be(true);//false

    expect(pareTree.__wildcardMatch('*i*g1', '*str*ing*')).to.be(true);

    expect(pareTree.__wildcardMatch('*ing1', '*ring*')).to.be(true);

    expect(pareTree.__wildcardMatch('*ing', 'test/long string*')).to.be(true);

    expect(pareTree.__wildcardMatch('test/long string*', '*st*ing')).to.be(true);

    expect(pareTree.__wildcardMatch('test/lo*', 'test/long string*')).to.be(true);

    expect(pareTree.__wildcardMatch('*/test/match', '*st*')).to.be(true);

    //left left
    expect(pareTree.__wildcardMatch('*/test/match', '*st/match')).to.be(true);

    //right right
    expect(pareTree.__wildcardMatch('/test/match*', '/test/match/*')).to.be(true);

    expect(pareTree.__wildcardMatch('/test/ma*', '*tes*/ma*')).to.be(true);

    expect(pareTree.__wildcardMatch('*test/match', '/test/mat*')).to.be(true);

    expect(pareTree.__wildcardMatch('/test/match*', '/blah/match/*')).to.be(false);//false

    //right left
    expect(pareTree.__wildcardMatch('/test/mat*', '*test/match')).to.be(true);

    //precise left
    expect(pareTree.__wildcardMatch('*test/match', '/test/match')).to.be(true);

    //precise right
    expect(pareTree.__wildcardMatch('/test/mat*', '/test/match')).to.be(true);

    //left left
    expect(pareTree.__wildcardMatch('*/test/match', '*st/blah')).to.be(false);//false

    //left right
    expect(pareTree.__wildcardMatch('*test/match', '/test/mar*')).to.be(false);//false

    //right left
    expect(pareTree.__wildcardMatch('/test/mat*', '*test/march')).to.be(false);//false

    //precise left
    expect(pareTree.__wildcardMatch('*test/match', '/test/ma*rch')).to.be(false);//false

    //precise right
    expect(pareTree.__wildcardMatch('/test/mat*', '*test/march')).to.be(false);//false

    expect(pareTree.__wildcardMatch('*test/mat', '*pe*st*')).to.be(false);//false

    return done();
  });

  //we create a bunch of subscriptions, then search using a wildcard
  //NB - this functionality makes permissions, and deep searching possible, ie: /wild/* and /wild/card/* in /wi*

  it('tests doing a wildcard search, left left', function(done){

    
    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('*/a/wildcard/left');

    var recipient = 'test-wildcard-left-recipient';

    var subscriptionReference = pareTree.__addSubscription(segmented, {key:recipient, data:'test'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_LEFT]).to.be(1);

    var recipients = [];

    var segmentedSearchPath = pareTree.__segmentPath('*/wildcard/left');

    pareTree.__wildcardSearchAndAppend(segmentedSearchPath, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_LEFT]).to.be(0);

    done();
  });

  it('tests doing a wildcard search, left right', function(done){
    
    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('/a/wildcard/right/*');

    var recipient = 'test-wildcard-left-recipient';

    var subscriptionReference = pareTree.__addSubscription(segmented, {key:recipient, data:'test'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_RIGHT]).to.be(1);

    var recipients = [];

    var segmentedSearchPath = pareTree.__segmentPath('*/wildcard/right/');

    pareTree.__wildcardSearchAndAppend(segmentedSearchPath, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_RIGHT]).to.be(0);

    done();
  });

  it('tests doing a wildcard search, left complex', function(done){
    
    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('*/wildcard*complex/*');

    var recipient = 'test-wildcard-left-recipient';

    var subscriptionReference = pareTree.__addSubscription(segmented, {key:recipient, data:'test'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX]).to.be(1);

    var recipients = [];

    var segmentedSearchPath = pareTree.__segmentPath('*/wildcard/complex*');

    pareTree.__wildcardSearchAndAppend(segmentedSearchPath, recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX]).to.be(0);

    done();
  });

});
