describe('wild-pare-sanity', function () {

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

  var SUBSCRIPTION_COUNT = 100;

  var DUPLICATE_KEYS = 3;

  var CLIENT_COUNT = 5;

  it('clearly demonstrates how the tree works, doing an add (precise and wild), remove, search and filter', function (done) {

    var PareTree = require('..'); //require('wild-pare');

    var subscriptionTree = new PareTree();

    //ADD PRECISE SUBSCRIPTIONS:

    subscriptionRef1 = subscriptionTree.add('/a/subscription/path', {
      key: 'subscriber1',
      data: {
        some: {
          custom: "data"
        },
        value: 12
      }
    });

    //returns:

    // {
    //   "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/0&/a/subscription/path"
    // }

    var queryResults1 = subscriptionTree.search('/a/subscription/path'); //or subscriptionTree.search({path:'/a/precise/subscription'})

    // console.log('queryResults:::');
    // console.log(JSON.stringify(queryResults1, null, 2));


    //returns a single subscription:

    // [
    //   {
    //     "key": "subscriber1",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 12
    //     },
    //     "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/0&/a/subscription/path"
    //   }
    // ]


    //add another subscription to the same path but with different data:

    var subscriptionRef2 = subscriptionTree.add('/a/subscription/path', {
      key: 'subscriber1',
      data: {
        some: {
          custom: "data"
        },
        value: 6
      }
    });

    //returns:

    // {
    //   "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/1&/a/subscription/path"
    // }


    // console.log('EXAMPLE3:::');
    // console.log(JSON.stringify(subscriptionRef2, null, 2));

    //query the tree:

    var queryResults2 = subscriptionTree.search('/a/subscription/path'); //or subscriptionTree.search({path:'/a/subscription/path'})

    // console.log('queryResults2:::');
    // console.log(JSON.stringify(queryResults2, null, 2));

    //returns our subscriptions:

    // [
    //   {
    //     "key": "subscriber1",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 12
    //     },
    //     "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/0&/a/subscription/path"
    //   },
    //   {
    //     "key": "subscriber1",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 6
    //     },
    //     "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/1&/a/subscription/path"
    //   }
    // ]

    //REMOVE SUBSCRIPTIONS:

    //remove a subscription, returns array containing subscription ids removed in {id:[id]} objects:

    var removalResult = subscriptionTree.remove(subscriptionRef1); // or subscriptionTree.remove({id:subscriptionReference.id}) or subscriptionTree.remove(subscriptionReference.recipient.path)

    //returns a reference to our first subscription:

    // [
    //   {
    //     "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/0&/a/subscription/path"
    //   }
    // ]

    // console.log('EXAMPLE5:::');
    // console.log(JSON.stringify(removalResult, null, 2));

    //we do a search again, our first subscription is no longer there

    var queryResultsRemove = subscriptionTree.search('/a/subscription/path'); //or subscriptionTree.search({path:'/a/subscription/path'})

    //returns:

    // [
    //   {
    //     "key": "subscriber1",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 6
    //     },
    //     "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/1&/a/subscription/path"
    //   }
    // ]

    // console.log('queryResultsRemove:::');
    // console.log(JSON.stringify(queryResultsRemove, null, 2));

    //you can also remove all subscriptions matching a path, regardless of what subscriber:
    // ie: subscriptionTree.remove('/a/subscription/*');

    //ADD WILDCARD SUBSCRIPTIONS:

    //add a wildcard subscription, wildcards are the * character - wildcards allow for any amount of text, so the following are valid wildcard paths:
    // /a/wildcard/subscription/* or */wildcard/subscription* or */wildcard* or */wildcard*/subscription/*
    // and would all return for a search that looks like this: /a/subscription/path

    //right wildcard:

    var wildcardRightRef = subscriptionTree.add('/a/subscription/*', {
      key: 'subscriber2',
      data: {
        some: {
          custom: "data"
        },
        value: 5
      }
    });

    //left wildcard:

    var wildcardLeftRef = subscriptionTree.add('*/subscription/path', {
      key: 'subscriber3',
      data: {
        some: {
          custom: "data"
        },
        value: 15
      }
    });

    //we now query our list, and should get 3 subscriptions returned,
    //as the wildcards match up and the subscriptionRef2 subscription also matches our search path:

    var queryResultsWildcard = subscriptionTree.search({
      path: '/a/subscription/path'
    });

    //returns:

    // [
    //   {
    //     "key": "subscriber1",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 6
    //     },
    //     "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/1&/a/subscription/path"
    //   },
    //   {
    //     "key": "subscriber2",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 5
    //     },
    //     "id": "subscriber2&2&D7R8LYFvSRCTAP5s88Uonw/2&/a/subscription/"
    //   },
    //   {
    //     "key": "subscriber3",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 15
    //     },
    //     "id": "subscriber3&1&D7R8LYFvSRCTAP5s88Uonw/3&/subscription/path"
    //   }
    // ]

    // console.log('EXAMPLE6:::');
    // console.log(JSON.stringify(queryResultsWildcard, null, 2));

    //MONGO STYLE FILTERS:

    queryResultsWildcard = subscriptionTree.search({
      path: '/a/subscription/path',
      filter: { // defaults to postFilter
        key: 'subscriber2'
      },
      // preFilter: {}, // acts on entire dataset before matching
      // postFilter: {} // acts only on selected set after matching
    }); //only subscriber2's subscriptions

    //returns:

    // [
    //   {
    //     "key": "subscriber2",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 5
    //     },
    //     "id": "subscriber2&2&D7R8LYFvSRCTAP5s88Uonw/2&/a/subscription/"
    //   }
    // ]

    // console.log('EXAMPLE7:::');
    // console.log(JSON.stringify(queryResultsWildcard, null, 2));

    //filtering by the subscription data, using an $lte operator:

    queryResultsWildcard = subscriptionTree.search({
      path: '/a/subscription/path',
      filter: {
        "data.value": {
          $lte: 10
        }
      }
    }); //only subscriptions with a data.value less than 10

    //returns:

    // [
    //   {
    //     "key": "subscriber1",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 6
    //     },
    //     "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/1&/a/subscription/path"
    //   },
    //   {
    //     "key": "subscriber2",
    //     "data": {
    //       "some": {
    //         "custom": "data"
    //       },
    //       "value": 5
    //     },
    //     "id": "subscriber2&2&D7R8LYFvSRCTAP5s88Uonw/2&/a/subscription/"
    //   }
    // ]

    // console.log('EXAMPLE8:::');
    // console.log(JSON.stringify(queryResultsWildcard, null, 2));

    done();
  });

  it('sense checks subscriptions and their attendant queries, by adding searching and removing', function (done) {

    this.timeout(300000);

    var subscriptionTree = new PareTree();

    var allKey = shortid.generate();

    var allTripleKey = shortid.generate();

    var leftKey = shortid.generate();

    var rightKey = shortid.generate();

    var complexLeftKey = shortid.generate();

    var complexRightKey = shortid.generate();

    var complexRightKey1 = shortid.generate();

    var multipleRightKey = shortid.generate();

    var multipleLeftKey = shortid.generate();

    var preciseKey = shortid.generate();

    var doubleSubscribePreciseKey = shortid.generate();

    var doubleSubscribeRightKey = shortid.generate();

    var doubleSubscribeLeftKey = shortid.generate();

    var searchResults = {};

    subscriptionTree.add('***', {
      key: allKey,
      data: {
        test: 1
      }
    });

    var testLeft = subscriptionTree.add('*/test/left', {
      key: leftKey,
      data: {
        test: 2
      }
    });

    subscriptionTree.add('test/right/*', {
      key: rightKey,
      data: {
        test: 3
      }
    });

    subscriptionTree.add('short/*/test/complex', {
      key: complexLeftKey,
      data: {
        test: 4
      }
    });

    subscriptionTree.add('/test/complex/*/short', {
      key: complexRightKey,
      data: {
        test: 5
      }
    });

    subscriptionTree.add('/test/complex/*', {
      key: complexRightKey1,
      data: {
        test: 5
      }
    });

    subscriptionTree.add('test/right/*/short/*/short', {
      key: multipleRightKey,
      data: {
        test: 6
      }
    });

    subscriptionTree.add('test/right/*/short', {
      key: multipleRightKey,
      data: {
        test: 7
      }
    });

    var testRef1 = subscriptionTree.add('short/*test/right/*/short', {
      key: multipleLeftKey,
      data: {
        test: 8
      }
    });

    subscriptionTree.add('/precise/test', {
      key: preciseKey,
      data: {
        test: 9
      }
    });

    subscriptionTree.add('/precise/double', {
      key: doubleSubscribePreciseKey,
      data: {
        test: 10
      }
    });

    subscriptionTree.add('/precise/double', {
      key: doubleSubscribePreciseKey,
      data: {
        test: 11
      }
    });

    subscriptionTree.add('double/right/*', {
      key: doubleSubscribeRightKey,
      data: {
        test: 12
      }
    });

    subscriptionTree.add('double/right/*', {
      key: doubleSubscribeRightKey,
      data: {
        test: 13
      }
    });

    subscriptionTree.add('*/double/left', {
      key: doubleSubscribeLeftKey,
      data: {
        test: 14
      }
    });

    subscriptionTree.add('*/double/left', {
      key: doubleSubscribeLeftKey,
      data: {
        test: 15
      }
    });

    var tripleAddRef = subscriptionTree.add('***', {
      key: allTripleKey,
      data: {
        test: 16
      }
    });

    subscriptionTree.add('*', {
      key: allTripleKey,
      data: {
        test: 17
      }
    });

    subscriptionTree.add('**', {
      key: allTripleKey,
      data: {
        test: 18
      }
    });

    //
    searchResults['a/test/left'] = subscriptionTree.search('a/test/left');
    searchResults['short/and/test/complex'] = subscriptionTree.search('short/and/test/complex');
    searchResults['/test/complex/and/short'] = subscriptionTree.search('/test/complex/and/short');

    subscriptionTree.remove(tripleAddRef);

    searchResults['test/right/and/short/and/short'] = subscriptionTree.search('test/right/and/short/and/short');
    searchResults['short/andtest/right/and/short'] = subscriptionTree.search('short/andtest/right/and/short');
    searchResults['/precise/test'] = subscriptionTree.search('/precise/test');
    searchResults['/precise/double'] = subscriptionTree.search('/precise/double');
    searchResults['double/right/and'] = subscriptionTree.search('double/right/and');
    searchResults['/precise/double'] = subscriptionTree.search('/precise/double');
    searchResults['and/double/left'] = subscriptionTree.search('and/double/left');

    expect(searchResults['a/test/left'].length).to.be(5);

    expect(searchResults['a/test/left'][0].data.test).to.be(2);

    //console.log(JSON.stringify(searchResults['short/and/test/complex'], null, 2));

    expect(searchResults['short/and/test/complex'].length).to.be(5);

    expect(searchResults['short/and/test/complex'][0].data.test).to.be(4);

    expect(searchResults['/test/complex/and/short'].length).to.be(6);

    expect(searchResults['/test/complex/and/short'][0].data.test).to.be(5);

    expect(searchResults['/test/complex/and/short'][1].key).to.be(complexRightKey);

    expect(searchResults['test/right/and/short/and/short'].length).to.be(6);

    expect(searchResults['test/right/and/short/and/short'][1].data.test).to.be(6);

    //console.log(JSON.stringify(searchResults['short/andtest/right/and/short'], null, 2));

    expect(searchResults['short/andtest/right/and/short'].length).to.be(4);

    expect(searchResults['short/andtest/right/and/short'][0].data.test).to.be(8);

    subscriptionTree.remove(testRef1);

    expect(subscriptionTree.search('short/andtest/right/and/short').length).to.be(3);

    expect(searchResults['/precise/double'].length).to.be(5);


    debugger;
    subscriptionTree.remove('/precise/double');

    expect(subscriptionTree.search('/precise/double').length).to.be(3);

    expect(searchResults['double/right/and'].length).to.be(5);

    expect(searchResults['double/right/and'][0].data.test).to.be(12);

    subscriptionTree.remove('*');

    expect(subscriptionTree.search('*').length).to.be(0);

    return done();
  });

  it('adds and verifies random wildcard-subscriptions ', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new PareTree();

    var subscriptionResults = {};

    subscriptions.forEach(function (subscriptionPath) {

      subscriptionPath = subscriptionPath.substring(0, subscriptionPath.length - 1) + '*';

      clients.forEach(function (sessionId) {

        subscriptionTree.add(subscriptionPath, {
          key: sessionId,
          data: {
            test: "data"
          }
        });

        if (!subscriptionResults[sessionId]) subscriptionResults[sessionId] = {
          paths: {}
        };

        subscriptionResults[sessionId].paths[subscriptionPath] = true;
      });
    });

    subscriptions.forEach(function (subscriptionPath) {

      subscriptionPath = subscriptionPath.substring(0, subscriptionPath.length - 1) + '*';

      subscriptionTree.search(subscriptionPath).forEach(function (recipient) {
        expect(subscriptionResults[recipient.key].paths[subscriptionPath]).to.be(true);
      });
    });

    return done();
  });

  it('adds and verifies random non wildcard-subscriptions ', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new PareTree();

    var subscriptionResults = {};

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        subscriptionTree.add(subscriptionPath, {
          key: sessionId,
          data: {
            test: "data"
          }
        });

        if (!subscriptionResults[sessionId]) subscriptionResults[sessionId] = {
          paths: {}
        };

        subscriptionResults[sessionId].paths[subscriptionPath] = true;
      });
    });

    subscriptions.forEach(function (subscriptionPath) {

      subscriptionTree.search(subscriptionPath).forEach(function (recipient) {
        expect(subscriptionResults[recipient.key].paths[subscriptionPath]).to.be(true);
      });
    });

    return done();
  });
});
