describe('sanity tests wild pare', function () {

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

  var SUBSCRIPTION_COUNT = 500;

  var DUPLICATE_KEYS = 3;

  var CLIENT_COUNT = 10;

  it('clearly demonstrates how the tree works, doing an add (precise and wild), remove, search and filter', function (done) {

    var PareTree = require('..'); //require('wild-pare');

    var subscriptionTree = new PareTree();

    //ADD PRECISE SUBSCRIPTIONS:

    subscriptionRef1 = subscriptionTree.add('/a/subscription/path', {
      key: 'subscriber1',
      data: {some: {custom: "data"}, value: 12}
    });

      //returns:

      // {
      //   "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/0&/a/subscription/path"
      // }

      var queryResults1 = subscriptionTree.search('/a/subscription/path');//or subscriptionTree.search({path:'/a/precise/subscription'})

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
        data: {some: {custom: "data"}, value: 6}
      });

      //returns:

      // {
      //   "id": "subscriber1&0&D7R8LYFvSRCTAP5s88Uonw/1&/a/subscription/path"
      // }


      // console.log('EXAMPLE3:::');
      // console.log(JSON.stringify(subscriptionRef2, null, 2));

      //query the tree:

      var queryResults2 = subscriptionTree.search('/a/subscription/path');//or subscriptionTree.search({path:'/a/subscription/path'})

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

      var queryResultsRemove = subscriptionTree.search('/a/subscription/path');//or subscriptionTree.search({path:'/a/subscription/path'})

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
        data: {some: {custom: "data"}, value: 5}
      });

      //left wildcard:

      var wildcardLeftRef = subscriptionTree.add('*/subscription/path', {
        key: 'subscriber3',
        data: {some: {custom: "data"}, value: 15}
      });

      //we now query our list, and should get 3 subscriptions returned,
      //as the wildcards match up and the subscriptionRef2 subscription also matches our search path:

      var queryResultsWildcard = subscriptionTree.search({path: '/a/subscription/path'});

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

      queryResultsWildcard = subscriptionTree.search({path: '/a/subscription/path', filter: {key: 'subscriber2'}});//only subscriber2's subscriptions

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

      queryResultsWildcard = subscriptionTree.search({path: '/a/subscription/path', filter: {"data.value":{$lte:10}}});//only subscriptions with a data.value less than 10

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

  it('sense checks the tree by adding, removing and searching items', function (done) {

    this.timeout(300000);

    var subscriptionTree = new PareTree();

    //add a subscription:

    var subscriptionReference = subscriptionTree.add('/a/precise/subscription', {
      key: 'subscriber1',
      data: {some: {custom: "data"}}
    });

    //query the tree:

    var queryResults = subscriptionTree.search('/a/precise/subscription');//or subscriptionTree.search({path:'/a/precise/subscription'})

    expect(queryResults.length).to.be(1);

    //remove a subscription:

    var removalResult = subscriptionTree.remove(subscriptionReference); // or subscriptionTree.remove({id:subscriptionReference.id}) or subscriptionTree.remove(subscriptionReference.recipient.path)

    //duplicateright wildcard
    var wildcardSubscriptionReference1 = subscriptionTree.add('/a/wildcard/subscription/*', {
      key: 'subscriber2',
      data: {some: {custom: "data"}}
    });

    var wildcardSubscriptionReference1_same = subscriptionTree.add('/a/wildcard/subscription/*', {
      key: 'subscriber2',
      data: {some: {custom: "other-data"}}
    });

    //a left wildcard
    var wildcardSubscriptionReference2 = subscriptionTree.add('*/wildcard/subscription/test', {
      key: 'subscriber2',
      data: {some: {custom: "data"}}
    });

    //added duplicate complex wildcards, just different data - anything that is enclosed with 2 * is slow and should be used with care
    var wildcardSubscriptionReference3 = subscriptionTree.add('*/wildcard*', {
      key: 'subscriber2',
      data: {some: {custom: "data"}}
    });
    var wildcardSubscriptionReference4 = subscriptionTree.add('*/wildcard*', {
      key: 'subscriber2',
      data: {some: {custom: "other-data"}}
    });

    var wildcardSubscriptionReference5 = subscriptionTree.add('*/wildcard*', {
      key: 'subscriber3',
      data: {some: {custom: "data"}}
    });

    var wildcardSubscriptionReference6 = subscriptionTree.add('*/wildcard*/subscription/*', {
      key: 'subscriber4',
      data: {some: {custom: "data"}}
    });

    //we now search the tree
    var wildcardSearchResult = subscriptionTree.search('/a/wildcard/subscription/test');

    //we should get 7 results, one for each subscription path (we have 2 path/subscriber pairings on our inserts)

    //some sense checking:

    expect(wildcardSearchResult.length).to.be(7);

    //demonstrates how custom data is managed and accessible in search results
    expect(wildcardSearchResult[0].data.some.custom).to.be("data");
    expect(wildcardSearchResult[1].data.some.custom).to.be("other-data");

    //Now lets remove the other subscriptions

    var removalResult1 = subscriptionTree.remove(wildcardSubscriptionReference1);

    var removalResult2 = subscriptionTree.remove(wildcardSubscriptionReference4);

    var removalResult3 = subscriptionTree.remove(wildcardSubscriptionReference5);

    //removalResults return with an array, containing an object/s that has only an id field
    //we return an array because the removal may have been by path
    expect(removalResult1[0].id).to.be(wildcardSubscriptionReference1.id);
    expect(removalResult2[0].id).to.be(wildcardSubscriptionReference4.id);
    expect(removalResult3[0].id).to.be(wildcardSubscriptionReference5.id);

    //Our list is now pruned:

    wildcardSearchResult = subscriptionTree.search('/a/wildcard/subscription/test');

    //some more sense checking:

    expect(wildcardSearchResult.length).to.be(4);

    expect(wildcardSearchResult[0].data.some.custom).to.be("other-data");

    expect(wildcardSearchResult[1].data.some.custom).to.be("data");

    return done();
  });

  it('sense checks subscriptions and their attendant queries', function (done) {

    this.timeout(300000);

    var subscriptionTree = new PareTree();

    var allKey = shortid.generate();

    var allTripleKey = shortid.generate();

    var leftKey = shortid.generate();

    var rightKey = shortid.generate();

    var complexLeftKey = shortid.generate();

    var complexRightKey = shortid.generate();

    var multipleRightKey = shortid.generate();

    var multipleLeftKey = shortid.generate();

    var preciseKey = shortid.generate();

    var doubleSubscribePreciseKey = shortid.generate();

    var doubleSubscribeRightKey = shortid.generate();

    var doubleSubscribeLeftKey = shortid.generate();

    var searchResults = {};

    subscriptionTree.add('***', {key: allKey, data: {test: 1}});

    var testLeft = subscriptionTree.add('*/test/left', {key: leftKey, data: {test: 2}});

    subscriptionTree.add('test/right/*', {key: rightKey, data: {test: 3}});

    subscriptionTree.add('short/*/test/complex', {key: complexLeftKey, data: {test: 4}});

    subscriptionTree.add('/test/complex/*/short', {key: complexRightKey, data: {test: 5}});

    subscriptionTree.add('test/right/*/short/*/short', {key: multipleRightKey, data: {test: 6}});

    subscriptionTree.add('test/right/*/short', {key: multipleRightKey, data: {test: 7}});

    subscriptionTree.add('short/*test/right/*/short', {key: multipleLeftKey, data: {test: 8}});

    subscriptionTree.add('/precise/test', {key: preciseKey, data: {test: 9}});

    subscriptionTree.add('/precise/double', {key: doubleSubscribePreciseKey, data: {test: 10}});

    subscriptionTree.add('/precise/double', {key: doubleSubscribePreciseKey, data: {test: 11}});

    subscriptionTree.add('double/right/*', {key: doubleSubscribeRightKey, data: {test: 12}});

    subscriptionTree.add('double/right/*', {key: doubleSubscribeRightKey, data: {test: 13}});

    subscriptionTree.add('*/double/left', {key: doubleSubscribeLeftKey, data: {test: 14}});

    subscriptionTree.add('*/double/left', {key: doubleSubscribeLeftKey, data: {test: 15}});

    subscriptionTree.add('***', {key: allTripleKey, data: {test: 16}});

    subscriptionTree.add('*', {key: allTripleKey, data: {test: 17}});

    subscriptionTree.add('**', {key: allTripleKey, data: {test: 18}});

    //
    searchResults['a/test/left'] = subscriptionTree.search('a/test/left');
    searchResults['short/and/test/complex'] = subscriptionTree.search('a/test/left');
    searchResults['/test/complex/and/short'] = subscriptionTree.search('a/test/left');
    searchResults['test/right/and/short/and/short'] = subscriptionTree.search('a/test/left');
    searchResults['short/andtest/right/and/short'] = subscriptionTree.search('a/test/left');
    searchResults['/precise/test'] = subscriptionTree.search('a/test/left');
    searchResults['/precise/double'] = subscriptionTree.search('a/test/left');
    searchResults['double/right/and'] = subscriptionTree.search('a/test/left');
    searchResults['/precise/double'] = subscriptionTree.search('a/test/left');
    searchResults['and/double/left'] = subscriptionTree.search('a/test/left');

    //testLog('SANITY 1 RESULTS:::', searchResults);

    expect(searchResults['a/test/left'].length).to.be(5);

    expect(searchResults['a/test/left'][0].data.test).to.be(2);

    return done();
  });

  it('sense checks subscriptions and their attendant queries, doing removes', function (done) {

    this.timeout(300000);

    var subscriptionTree = new PareTree();

    var allKey = shortid.generate();

    var allTripleKey = shortid.generate();

    var leftKey = shortid.generate();

    var rightKey = shortid.generate();

    var complexLeftKey = shortid.generate();

    var complexRightKey = shortid.generate();

    var multipleRightKey = shortid.generate();

    var multipleLeftKey = shortid.generate();

    var preciseKey = shortid.generate();

    var doubleSubscribePreciseKey = shortid.generate();

    var doubleSubscribeRightKey = shortid.generate();

    var doubleSubscribeLeftKey = shortid.generate();

    var searchResultsBefore = [];

    var searchResultsAfter = [];

    var allSubscription = subscriptionTree.add('***', {key: allKey, data: {test: 1}});

    var leftSubscription = subscriptionTree.add('*/test/left', {key: leftKey, data: {test: 2}});

    var rightSubscription = subscriptionTree.add('test/right/*', {key: rightKey, data: {test: 3}});

    var complexLeftSubscription = subscriptionTree.add('short/*/test/complex', {key: complexLeftKey, data: {test: 4}});

    var complexRightSubscription = subscriptionTree.add('/test/complex/*/short', {
      key: complexRightKey,
      data: {test: 5}
    });

    var multipleRightSubscription = subscriptionTree.add('test/right/*/short/*/short', {
      key: multipleRightKey,
      data: {test: 6}
    });

    var preciseDoubleSubscription1 = subscriptionTree.add('/precise/double', {
      key: doubleSubscribePreciseKey,
      data: {test: 10}
    });

    var preciseDoubleSubscription2 = subscriptionTree.add('/precise/double', {
      key: doubleSubscribePreciseKey,
      data: {test: 11}
    });

    var doubleRightSubscription1 = subscriptionTree.add('double/right/*', {
      key: doubleSubscribeRightKey,
      data: {test: 12}
    });

    var doubleRightSubscription2 = subscriptionTree.add('double/right/*', {
      key: doubleSubscribeRightKey,
      data: {test: 13}
    });

    var doubleLeftSubscription1 = subscriptionTree.add('*/double/left', {
      key: doubleSubscribeLeftKey,
      data: {test: 14}
    });

    var doubleLeftSubscription2 = subscriptionTree.add('*/double/left', {
      key: doubleSubscribeLeftKey,
      data: {test: 15}
    });

    var tripleAllSubscription1 = subscriptionTree.add('***', {key: allTripleKey, data: {test: 16}});

    var tripleAllSubscription2 = subscriptionTree.add('*', {key: allTripleKey, data: {test: 17}});

    var tripleAllSubscription3 = subscriptionTree.add('**', {key: allTripleKey, data: {test: 18}});

    searchResultsBefore.push({path: 'a/test/left', results: subscriptionTree.search('a/test/left')});

    expect(searchResultsBefore[searchResultsBefore.length - 1].results.length).to.be(5);
    //
    searchResultsBefore.push({path: 'test/right/a', results: subscriptionTree.search('test/right/a')});
    //
    searchResultsBefore.push({
      path: 'short/and/test/complex',
      results: subscriptionTree.search('short/and/test/complex')
    });
    //
    searchResultsBefore.push({
      path: '/test/complex/and/short',
      results: subscriptionTree.search('/test/complex/and/short')
    });
    //
    searchResultsBefore.push({
      path: 'test/right/and/short/and/short',
      results: subscriptionTree.search('test/right/and/short/and/short')
    });

    searchResultsBefore.push({
      path: 'short/andtest/right/and/short',
      results: subscriptionTree.search('short/andtest/right/and/short')
    });
    //
    searchResultsBefore.push({path: '/precise/test', results: subscriptionTree.search('/precise/test')});
    // //
    searchResultsBefore.push({path: '/precise/double', results: subscriptionTree.search('/precise/double')});
    // //
    searchResultsBefore.push({path: 'double/right/and', results: subscriptionTree.search('double/right/and')});
    // //
    searchResultsBefore.push({path: '/precise/double', results: subscriptionTree.search('/precise/double')});
    // //
    searchResultsBefore.push({path: 'and/double/left', results: subscriptionTree.search('and/double/left')});

    expect(subscriptionTree.search('*').length).to.be(4);

    subscriptionTree.remove(allSubscription);

    expect(subscriptionTree.search('*').length).to.be(3);

    subscriptionTree.remove({id: leftSubscription.id});

    subscriptionTree.remove('double/right/*');

    expect(subscriptionTree.search('*').length).to.be(3);

    var allResults = subscriptionTree.search('*');

    expect(allResults[0].data.test).to.be(16);

    subscriptionTree.remove(tripleAllSubscription2);

    allResults = subscriptionTree.search('*');

    expect(allResults[0].data.test).to.be(16);

    subscriptionTree.remove('*/test/left');

    subscriptionTree.remove(preciseDoubleSubscription1);

    searchResultsAfter.push({path: 'a/test/left', results: subscriptionTree.search('a/test/left')});

    expect(searchResultsAfter[searchResultsAfter.length - 1].results.length).to.be(2);

    searchResultsAfter.push({path: 'test/right/a', results: subscriptionTree.search('test/right/a')});

    expect(searchResultsAfter[searchResultsAfter.length - 1].results.length).to.be(3);

    searchResultsAfter.push({
      path: 'short/and/test/complex',
      results: subscriptionTree.search('short/and/test/complex')
    });
    //
    searchResultsAfter.push({
      path: '/test/complex/and/short',
      results: subscriptionTree.search('/test/complex/and/short')
    });
    //
    searchResultsAfter.push({
      path: 'test/right/and/short/and/short',
      results: subscriptionTree.search('test/right/and/short/and/short')
    });

    searchResultsAfter.push({
      path: 'short/andtest/right/and/short',
      results: subscriptionTree.search('short/andtest/right/and/short')
    });
    //
    searchResultsAfter.push({path: '/precise/test', results: subscriptionTree.search('/precise/test')});
    // //
    searchResultsAfter.push({path: '/precise/double', results: subscriptionTree.search('/precise/double')});
    // //
    searchResultsAfter.push({path: 'double/right/and', results: subscriptionTree.search('double/right/and')});

    expect(searchResultsAfter[searchResultsAfter.length - 1].results.length).to.be(2);
    // //
    searchResultsAfter.push({path: '/precise/double', results: subscriptionTree.search('/precise/double')});
    // //
    searchResultsAfter.push({path: 'and/double/left', results: subscriptionTree.search('and/double/left')});

    subscriptionTree.remove('*');

    expect(subscriptionTree.search('*').length).to.be(0);

    return done();
  });

  it('adds and verifies random wildcard-subscriptions ', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({duplicate: DUPLICATE_KEYS, count: SUBSCRIPTION_COUNT});

    var clients = random.string({count: CLIENT_COUNT});

    var subscriptionTree = new PareTree();

    var subscriptionResults = {};

    subscriptions.forEach(function (subscriptionPath) {

      subscriptionPath = subscriptionPath.substring(0, subscriptionPath.length - 1) + '*';

      clients.forEach(function (sessionId) {

        subscriptionTree.add(subscriptionPath, {key: sessionId, data: {test: "data"}});

        if (!subscriptionResults[sessionId]) subscriptionResults[sessionId] = {paths: {}};

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

    var subscriptions = random.randomPaths({duplicate: DUPLICATE_KEYS, count: SUBSCRIPTION_COUNT});

    var clients = random.string({count: CLIENT_COUNT});

    var subscriptionTree = new PareTree();

    var subscriptionResults = {};

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        subscriptionTree.add(subscriptionPath, {key: sessionId, data: {test: "data"}});

        if (!subscriptionResults[sessionId]) subscriptionResults[sessionId] = {paths: {}};

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
