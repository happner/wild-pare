describe('performance', function () {

  this.timeout(5000);

  var expect = require('expect.js');

  var random = require('../__fixtures/random');

  var SearchTree = require('../../lib/binary-search-tree');

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

  it('adds and verifies random precise subscriptions, non-wildcard query path', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new SearchTree();

    var inserts = 0;

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        subscriptionTree.insert(subscriptionPath, {
          key: sessionId,
          data: {
            test: "data"
          }
        });
        inserts++;
        if (inserts % 100 == 0) console.log(inserts + ' inserted.');
      });
    });

    done();
  });

  it('adds and verifies random wildcard subscriptions, non-wildcard query path', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new SearchTree();

    var inserts = 0;

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        subscriptionPath = subscriptionPath.substring(0, subscriptionPath.length - 1) + '*';

        subscriptionTree.insert(subscriptionPath, {
          key: sessionId,
          data: {
            test: "data"
          }
        });
        inserts++;
        if (inserts % 100 == 0) console.log(inserts + ' inserted.');
      });
    });

    return done();
  });
});
