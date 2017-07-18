describe('performance tests wild pare', function () {

  this.timeout(5000);

  var expect = require('expect.js');

  var random = require('./fixtures/random');

  var PareTree = require('..');

  var VERBOSE = true;

  var async = require('async');

  var testLog = function(message, object){
    if (VERBOSE){
      console.log(message);
      if (object) console.log(JSON.stringify(object, null,2));
    }
  };

  var SUBSCRIPTION_COUNT = 10000;

  var DUPLICATE_KEYS = 3;

  var CLIENT_COUNT = 10;

  it('adds and verifies random wildcard subscriptions ', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({duplicate:DUPLICATE_KEYS, count:SUBSCRIPTION_COUNT});

    var clients = random.string({count:CLIENT_COUNT});

    var subscriptionTree = new PareTree();

    var inserts = 0;

    var searched = 0;

    var startedInsert = Date.now();

    subscriptions.forEach(function(subscriptionPath) {

      clients.forEach(function (sessionId) {

        subscriptionPath = subscriptionPath.substring(0, subscriptionPath.length - 1) + '*';

        subscriptionTree.add(subscriptionPath, {key:sessionId, data:{test:"data"}});
        inserts++;
      });
    });

    var endedInsert = Date.now();

    var startedSearches = Date.now();

    subscriptions.forEach(function(subscriptionPath){

      searched++;
      subscriptionTree.search(subscriptionPath, null);
    });

    var endedSearches = Date.now();

    testLog('did ' + inserts + ' wildcard inserts in ' + (endedInsert - startedInsert) + ' milliseconds');

    testLog('did ' + searched + ' wildcard searches in ' + (endedSearches - startedSearches) + ' milliseconds, in a tree with += ' + inserts + ' nodes.');

    return done();
  });

  it('adds and verifies random precise subscriptions ', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({duplicate:DUPLICATE_KEYS, count:SUBSCRIPTION_COUNT});

    var clients = random.string({count:CLIENT_COUNT});

    var subscriptionTree = new PareTree();

    var inserts = 0;

    var searched = 0;

    var startedInsert = Date.now();

    subscriptions.forEach(function(subscriptionPath) {

      clients.forEach(function (sessionId) {

        subscriptionTree.add(subscriptionPath, {key:sessionId, data:{test:"data"}});
        inserts++;
      });
    });

    var endedInsert = Date.now();

    var startedSearches = Date.now();

    subscriptions.forEach(function(subscriptionPath){

      searched++;
      subscriptionTree.search(subscriptionPath, null);
    });

    var endedSearches = Date.now();

    testLog('did ' + inserts + ' precise inserts in ' + (endedInsert - startedInsert) + ' milliseconds');

    testLog('did ' + searched + ' precise searches in ' + (endedSearches - startedSearches) + ' milliseconds, in a tree with += ' + inserts + ' nodes.');

    done();

    //console.log('analytics:::', JSON.stringify(subscriptionTree.__analytics, null, 2)); // did some profiling, found issue with the _id generation was slowing inserts down
  });

  var N_SUBSCRIPTION_COUNT = 10000;

  var SEARCHES = 100;

  it('searches N subscriptions ', function (done) {

    this.timeout(10000);

    console.log('searching N:::');

    var subscriptions = random.randomPaths({duplicate:DUPLICATE_KEYS, count:N_SUBSCRIPTION_COUNT});

    var clients = random.string({count:CLIENT_COUNT});

    var subscriptionTree = new PareTree();

    var subscriptionResults = {};

    console.log('adding subs:::');

    subscriptions.forEach(function(subscriptionPath){

      clients.forEach(function(sessionId){

        subscriptionTree.add(subscriptionPath, {key:sessionId, data:{test:"data"}});

        if (!subscriptionResults[sessionId]) subscriptionResults[sessionId] = {paths:{}};

        subscriptionResults[sessionId].paths[subscriptionPath] = true;
      });
    });

    var startedSearches = Date.now();

    var searched = 0;

    console.log('searching subs:::');

    subscriptions.every(function(subscriptionPath){

      searched++;

      subscriptionPath = subscriptionPath.substring(0, subscriptionPath.length - 1) + '*';

      subscriptionTree.search(subscriptionPath);

      if (searched == SEARCHES) return false;

      return true;
    });

    var endedSearches = Date.now();

    testLog('searched through ' + N_SUBSCRIPTION_COUNT * CLIENT_COUNT + ' subscriptions ' + SEARCHES + ' times, in ' + (endedSearches - startedSearches) + ' milliseconds');

    return done();

  })
});
