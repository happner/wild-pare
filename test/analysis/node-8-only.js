describe('performance', function () {

  this.timeout(5000);

  var expect = require('expect.js');

  var random = require('../__fixtures/random');

  var VERBOSE = true;

  var async = require('async');

  var testLog = function (message, object) {
    if (VERBOSE) {
      console.log(message);
      if (object) console.log(JSON.stringify(object, null, 2));
    }
  };

  var DUPLICATE_KEYS = 3;

  var CLIENT_COUNT = 10;

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

    var WildPare =  analyzer.require('../../index.js', true);

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
});