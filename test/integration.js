describe('integration', function () {

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

    //short/*test/right/*/short
    subscriptionTree.remove(testRef1);

    expect(subscriptionTree.search('short/andtest/right/and/short').length).to.be(3);

    expect(searchResults['/precise/double'].length).to.be(5);

    debugger;

    expect(subscriptionTree.search('/precise/double').length).to.be(5);

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

  context('filters', function () {

    beforeEach(function () {

      this.tree = new PareTree();

      this.tree.add('/some/path/one', {
        key: 'subscriber1',
        data: {

        }
      });

      this.tree.add('/some/path/one', {
        key: 'subscriber2',
        data: {

        }
      });

      this.tree.add('/some/path/one', {
        key: 'subscriber3',
        data: {

        }
      });

      this.tree.add('/some/path/two', {
        key: 'subscriber4',
        data: {

        }
      });

    });

    it('can post-filter', function (done) {

      var res = this.tree.search({
        path: '/some/*',
        postFilter: {
          key: 'subscriber2'
        }
      });

      expect(res.length).to.be(1);
      expect(res[0].key).to.be('subscriber2');
      done();

    });

    xit('can pre-filter', function (done) {

      /*

        DONE __wildcardSearchAndAppend
        DONE __appendRecipients
        DONE __iterateWildcardSearch
        __iterateAll


        DONE __searchAndAppend
        DONE __appendRecipients
        DONE __iterateAllBranches
        __iteratePrecise
        __iterateWildcard
        __iterateAll

      */

      console.log('TODO: flush cache on subscription add / remove');

      var res = this.tree.search({
        path: '/some/*',
        preFilter: {
          recipients: {
            subscriber4: {
              $exists: true
            }
          }
          // key: 'subscriber4'
        }
      });

      expect(res.length).to.be(1);
      expect(res[0].key).to.be('subscriber4');

      console.log('TEST ADD DOES CLEAR CACHE');
      console.log('TEST REMOVE DOES CLEAR CACHE');

      done();

    });

    xit('can pre and post-filter', function (done) {

    });

    it('does post-filter if filter placement unspecified', function (done) {

      var res = this.tree.search({
        path: '/some/*',
        filter: {
          key: 'subscriber2'
        }
      });

      expect(res.length).to.be(1);
      expect(res[0].key).to.be('subscriber2');
      done();

    });

  });

});
