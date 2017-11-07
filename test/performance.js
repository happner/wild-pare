describe('performance', function () {

  this.timeout(5000);

  var expect = require('expect.js');

  var random = require('./__fixtures/random');

  var PareTree = require('..');

  var VERBOSE = true;

  var async = require('async');

  var testLog = function (message, object) {
    if (VERBOSE) {
      console.log(message);
      if (object) console.log(JSON.stringify(object, null, 2));
    }
  };

  var SUBSCRIPTION_COUNT = 1000;

  var DUPLICATE_KEYS = 3;

  var CLIENT_COUNT = 10;

  it('adds and verifies random wildcard subscriptions, glob mode', function (done) {

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

    testLog('did ' + searched + ' glob searches in ' + (endedSearches - startedSearches) + ' milliseconds, in a tree with += ' + inserts + ' nodes.');

    var perMillisecond = searched / (endedSearches - startedSearches);

    testLog(perMillisecond + ' per millisecond');

    testLog(perMillisecond * 1000 + ' per second');

    return done();
  });

  it('adds and verifies random wildcard subscriptions, wildstring mode', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new PareTree({mode:'wildstring'});

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

    var perMillisecond = searched / (endedSearches - startedSearches);

    testLog(perMillisecond + ' per millisecond');

    testLog(perMillisecond * 1000 + ' per second');

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

    var perMillisecond = searched / (endedSearches - startedSearches);

    testLog(perMillisecond + ' per millisecond');

    testLog(perMillisecond * 1000 + ' per second');

    done();
  });

  it('adds and verifies random precise subscriptions, non-wildcard query path, wildstring mode', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
      duplicate: DUPLICATE_KEYS,
      count: SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new PareTree({mode:'wildstring'});

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

    var perMillisecond = searched / (endedSearches - startedSearches);

    testLog(perMillisecond + ' per millisecond');

    testLog(perMillisecond * 1000 + ' per second');

    done();
  });

  it('adds, verifies and removes by path random precise subscriptions', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
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

    var startedRemoves = Date.now();

    var results = 0;

    subscriptions.forEach(function (subscriptionPath) {

      searched++;
      //console.log('removing:::', subscriptionPath);
      var result = subscriptionTree.remove(subscriptionPath).length;
      //console.log('result:::', result);

      results += result;
    });

    expect(results / CLIENT_COUNT).to.be(subscriptions.length);

    var endedRemoves = Date.now();

    testLog('did ' + inserts + ' precise inserts in ' + (endedInsert - startedInsert) + ' milliseconds');

    testLog('did ' + searched + ' precise removes in ' + (endedRemoves - startedRemoves) + ' milliseconds, in a tree with += ' + inserts + ' nodes.');

    var perMillisecond = searched / (endedRemoves - startedRemoves);

    testLog(perMillisecond + ' per millisecond');

    testLog(perMillisecond * 1000 + ' per second');

    done();
  });

  it('adds, verifies and removes by id random precise subscriptions', function (done) {

    this.timeout(300000);

    var subscriptions = random.randomPaths({
      count: SUBSCRIPTION_COUNT
    });

    var clients = random.string({
      count: CLIENT_COUNT
    });

    var subscriptionTree = new PareTree();

    var inserts = 0;

    var searched = 0;

    var startedInsert = Date.now();

    var toRemove = [];

    subscriptions.forEach(function (subscriptionPath) {

      clients.forEach(function (sessionId) {

        toRemove.push(subscriptionTree.add(subscriptionPath, {
          key: sessionId,
          data: {
            test: "data"
          }
        }));
        inserts++;
        if (inserts % 1000 == 0) console.log(inserts + ' inserted.');
      });
    });

    var endedInsert = Date.now();

    var startedRemoves = Date.now();

    var results = 0;

    toRemove.forEach(function (reference) {

      searched++;
      //console.log('removing:::', subscriptionPath);
      var result = subscriptionTree.remove(reference).length;
      //console.log('result:::', result);

      results += result;
    });

    expect(results / CLIENT_COUNT).to.be(subscriptions.length);

    var endedRemoves = Date.now();

    testLog('did ' + inserts + ' precise inserts in ' + (endedInsert - startedInsert) + ' milliseconds');

    testLog('did ' + searched + ' precise removes in ' + (endedRemoves - startedRemoves) + ' milliseconds, in a tree with += ' + inserts + ' nodes.');

    var perMillisecond = searched / (endedRemoves - startedRemoves);

    testLog(perMillisecond + ' per millisecond');

    testLog(perMillisecond * 1000 + ' per second');

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

    var subscriptionTree = new PareTree();

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

      return (searched != SEARCHES);
    });

    var endedSearches = Date.now();

    testLog('searched through ' + N_SUBSCRIPTION_COUNT * CLIENT_COUNT + ' subscriptions ' + SEARCHES + ' times, in ' + (endedSearches - startedSearches) + ' milliseconds');

    return done();

  });
});
