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

  it('tests the permutate function', function (done) {

    var pareTree = new PareTree();

    //var mutations = pareTree.__permutate('simon', pareTree.SEGMENT_TYPE.WILDCARD_COMPLEX);

    pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_LEFT] = 1;
    pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_RIGHT] = 1;

    var mutations = pareTree.__permutate('/a/very/long/path/simon', pareTree.SEGMENT_TYPE.WILDCARD_LEFT);
    
    expect(mutations.length).to.be(23);

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

  // it('tests adding a subscription id and pushing the path data to an internal index', function(done){
  //
  //   var pareTree = new PareTree();
  //
  //   var testData = {
  //     key:'testKey',
  //     type:pareTree.SEGMENT_TYPE.ALL,
  //     path:'testPath'
  //   };
  //
  //   var id = pareTree.__createId(testData.key, testData.type, testData.path);
  //
  //   var idParts = pareTree.__subscriptionData.search(id)[0];
  //
  //   expect(idParts).to.eql(testData);
  //
  //   expect(pareTree.__counts[testData.type]).to.be(1);
  //
  //   pareTree.__releaseId(id);
  //
  //   idParts = pareTree.__subscriptionData.search(id)[0];
  //
  //   expect(idParts).to.be(undefined);
  //
  //   expect(pareTree.__counts[testData.type]).to.be(0);
  //
  //   done();
  // });

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

    console.log('segmented:::', segmented);

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

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend('doing/a/wildcard/complex/test', recipients);

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

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend('test/a/wildcard/left', recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD]).to.be(0);

    done();

  });

  it('adds and removes a right wildcard subscription', function (done) {

    var pareTree = new PareTree();

    var segmented = pareTree.__segmentPath('/a/wildcard/right/*');

    var recipient = 'test-wildcard-right-recipient';

    var subscriptionReference = pareTree.__addSubscription(segmented, {key:recipient, data:'test'});

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD_RIGHT]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend('/a/wildcard/right/test', recipients);

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

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD]).to.be(1);

    var recipients = [];

    pareTree.__searchAndAppend('doing/a/wildcard/complex/test', recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test-complex');

    expect(recipients[0].key).to.be('test-wildcard-complex-recipient');

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.WILDCARD]).to.be(0);

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

    pareTree.__searchAndAppend('*', recipients);

    expect(recipients.length).to.be(1);

    expect(recipients[0].data).to.be('test');

    expect(Object.keys(pareTree.__trunkAll.recipients).length).to.be(1);

    var removeReference = pareTree.__removeSpecific(subscriptionReference);

    expect(removeReference.id).to.be(subscriptionReference.id);

    expect(pareTree.__counts[pareTree.SEGMENT_TYPE.ALL]).to.be(0);

    expect(Object.keys(pareTree.__trunkAll.recipients).length).to.be(0);

    done();
  });

  xit('tests doing a wildcard search', function(){

    //we create a bunch of subscriptions, then search using a wildcard
    //NB - this functionality makes permissions, and deep searching possible, ie: /wild/* and /wild/card/* in /wi*

  });

});
