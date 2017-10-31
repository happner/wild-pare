describe('performance', function () {

  this.timeout(5000);

  var expect = require('expect.js');

  var random = require('./fixtures/random');

  var PareTree = require('..');

  var VERBOSE = true;

  var async = require('async');

  var testLog = function (message, object) {
    if (VERBOSE) {
      console.log(message);
      if (object) console.log(JSON.stringify(object, null, 2));
    }
  };

  var SUBSCRIPTION_COUNT = 10000;

  var DUPLICATE_KEYS = 3;

  var CLIENT_COUNT = 10;

  it('adds and verifies random wildcard subscriptions, non-wildcard query path', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new PareTree();

    var inserts = 0;

    var searched = 0;

    var startedInsert = Date.now();

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        subscriptionPath = subscriptionPath.substring(0, subscriptionPath.length - 1) + '*';

        subscriptionTree.add(subscriptionPath, {
          key: sessionId,
          data: {
            test: "data"
          }
        });
        inserts++;
        if (inserts % 1000 == 0) console.log(inserts + ' inserted.');
      });
    });

    var endedInsert = Date.now();

    var startedSearches = Date.now();

    var results = 0;

    subscriptions.forEach(function (subscriptionPath) {

      searched++;
      results += subscriptionTree.search(subscriptionPath, {decouple:true}).length;
    });

    expect(results / (DUPLICATE_KEYS * CLIENT_COUNT)).to.be(subscriptions.length);

    var endedSearches = Date.now();

    testLog('did ' + inserts + ' wildcard inserts in ' + (endedInsert - startedInsert) + ' milliseconds');

    testLog('did ' + searched + ' wildcard searches in ' + (endedSearches - startedSearches) + ' milliseconds, in a tree with += ' + inserts + ' nodes.');

    return done();
  });

  it('adds and verifies random precise subscriptions, non-wildcard query path', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new PareTree();

    var inserts = 0;

    var searched = 0;

    var startedInsert = Date.now();

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        subscriptionTree.add(subscriptionPath, {
          key: sessionId,
          data: {
            test: "data"
          }
        });
        inserts++;
        if (inserts % 1000 == 0) console.log(inserts + ' inserted.');
      });
    });

    var endedInsert = Date.now();

    var startedSearches = Date.now();

    var results = 0;

    subscriptions.forEach(function (subscriptionPath) {

      searched++;
      results += subscriptionTree.search(subscriptionPath, {decouple:true}).length;
    });

    expect(results / (DUPLICATE_KEYS * CLIENT_COUNT)).to.be(subscriptions.length);

    var endedSearches = Date.now();

    testLog('did ' + inserts + ' precise inserts in ' + (endedInsert - startedInsert) + ' milliseconds');

    testLog('did ' + searched + ' precise searches in ' + (endedSearches - startedSearches) + ' milliseconds, in a tree with += ' + inserts + ' nodes.');

    done();
  });




  var W_SUBSCRIPTION_COUNT = 10000;

  it('tests the wildcard search matching, wildcard on both paths', function (done) {

    this.timeout(300000);

    var pareTree = new PareTree();

    var subscriptions = random.randomPaths({
      count: W_SUBSCRIPTION_COUNT
    });

    var wildcardPaths1 = subscriptions.map(function (subscription) {
      return subscription.substring(0, random.integer(0, subscription.length - 1)) + '*';
    });

    var wildcardPaths2 = wildcardPaths1.map(function (subscription) {
      return '*' + subscription.substring(random.integer(1, subscription.length - 1), subscription.length - 2);
    });

    var started = Date.now();

    var errored = false;

    subscriptions.forEach(function (subscription, subscriptionIndex) {
      if (!pareTree.__wildcardMatch(wildcardPaths1[subscriptionIndex], wildcardPaths2[subscriptionIndex])) {
        console.log('expected a true: ', wildcardPaths1[subscriptionIndex], wildcardPaths2[subscriptionIndex]);
        errored = true;
      }
    });

    var completed = Date.now() - started;

    console.log('milliseconds:::', completed);

    if (errored) return done(new Error('failed'));

    done();
  });

  it('tests the search matching, wildcard on one path', function (done) {

    this.timeout(300000);

    var pareTree = new PareTree();

    var subscriptions = random.randomPaths({
      count: W_SUBSCRIPTION_COUNT
    });

    var wildcards = subscriptions.map(function (subscription) {
      return subscription.substring(0, random.integer(0, subscription.length - 1)) + '*';
    });

    var started = Date.now();

    subscriptions.every(function (subscription, subscriptionIndex) {
      if (!pareTree.__wildcardMatch(wildcards[subscriptionIndex], subscription)) {
        done(new Error('expected a true'));
        return false;
      }
      return true;
    });

    var completed = Date.now() - started;

    console.log('milliseconds:::', completed);

    done();
  });

  var N_SUBSCRIPTION_COUNT = 10000;

  var SEARCHES = 10;

  it('searches ' + N_SUBSCRIPTION_COUNT + ' subscriptions,' + SEARCHES + ' times, no wildcard in search path', function (done) {

    this.timeout(60000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: N_SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var analyzer = require('happner-profane').create();

    var WildPare =  analyzer.require('../index.js', true);

    var subscriptionTree = new WildPare();

    var subscriptionResults = {};

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        subscriptionTree.add(subscriptionPath.substring(0, subscriptionPath.length - 1) + '*', {
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

    var startedSearches = Date.now();

    var searched = 0;

    subscriptions.every(function (subscriptionPath) {

      searched++;

      subscriptionTree.search(subscriptionPath);

      if (searched == SEARCHES) return false;

      return true;
    });

    var endedSearches = Date.now();

    testLog('searched through ' + N_SUBSCRIPTION_COUNT * CLIENT_COUNT + ' subscriptions ' + SEARCHES + ' times, in ' + (endedSearches - startedSearches) + ' milliseconds');

    var analysis = analyzer.getAnalysis();

    console.log('analysis:::', analysis);

    analyzer.cleanup();

    return done();

  });

  it('searches ' + N_SUBSCRIPTION_COUNT + ' subscriptions,' + SEARCHES + ' times, wildcard in search path', function (done) {

    this.timeout(60000);

    var analyzer = require('happner-profane').create();

    var WildPare = analyzer.require('../index.js', true);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: N_SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new WildPare();

    var subscriptionResults = {};

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        //console.log('added:::', subscriptionPath);

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

    var searched = 0;
    var searching = 0;

    var searchSubscriptions = [];

    subscriptions.every(function (subscriptionPath) {

      searching++;

      searchSubscriptions.push(subscriptionPath.substring(0, subscriptionPath.length - 2) + '*');

      return searching < SEARCHES;
    });

    var startedSearches = Date.now();

    var didntFind = false;

    searchSubscriptions.forEach(function (subscriptionPath) {

      searched++;

      var items = subscriptionTree.search(subscriptionPath);

      if (items.length != (DUPLICATE_KEYS * CLIENT_COUNT)) didntFind = true;
    });

    if (didntFind) return done(new Error('expected to find ' + (DUPLICATE_KEYS * CLIENT_COUNT) + ' items'));

    var endedSearches = Date.now();

    testLog('searched through ' + N_SUBSCRIPTION_COUNT * CLIENT_COUNT + ' subscriptions ' + SEARCHES + ' times, in ' + (endedSearches - startedSearches) + ' milliseconds');

    var analysis = analyzer.getAnalysis();

    console.log('analysis:::', analysis);

    analyzer.cleanup();

    return done();

  });

  it('searches ' + N_SUBSCRIPTION_COUNT + ' subscriptions,' + SEARCHES + ' times, wildcard in search path and in key', function (done) {

    this.timeout(60000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: N_SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var analyzer = require('happner-profane').create();

    var WildPare = analyzer.require('../index.js', true);

    var subscriptionTree = new WildPare();

    var subscriptionResults = {};

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        var addPath = subscriptionPath.substring(0, subscriptionPath.length - 1) + '*';

        subscriptionTree.add(addPath, {
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

    var searched = 0;
    var searching = 0;

    var searchSubscriptions = [];

    subscriptions.every(function (subscriptionPath) {

      searching++;

      searchSubscriptions.push(subscriptionPath.substring(0, subscriptionPath.length - 2) + '*');

      return searching < SEARCHES;
    });

    var startedSearches = Date.now();

    var didntFind = false;

    searchSubscriptions.forEach(function (subscriptionPath) {

      searched++;

      var items = subscriptionTree.search(subscriptionPath);

      if (items.length != (DUPLICATE_KEYS * CLIENT_COUNT)) didntFind = true;
    });

    if (didntFind) return done(new Error('expected to find ' + (DUPLICATE_KEYS * CLIENT_COUNT) + ' items'));

    var endedSearches = Date.now();

    testLog('searched through ' + N_SUBSCRIPTION_COUNT * CLIENT_COUNT + ' subscriptions ' + SEARCHES + ' times, in ' + (endedSearches - startedSearches) + ' milliseconds');

    var analysis = analyzer.getAnalysis();

    console.log('analysis:::', analysis);

    analyzer.cleanup();

    return done();

  })
});
