describe('unit', function () {

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

  it('tests adding a subscription', function (done) {
    var pareTree = new PareTree();

    pareTree.add('test/*', {key:'testKey1', data:{test:'data'}});

    done();
  });

  it('tests adding and finding a complex subscription', function (done) {
    var pareTree = new PareTree();

    pareTree.add('*test/*', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('*test/*').length).to.be(1);

    done();
  });

  it('tests adding and finding a LL subscription', function (done) {
    var pareTree = new PareTree();

    pareTree.add('*test/', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('*test/').length).to.be(1);

    done();
  });

  it('tests adding and finding a LR subscription', function (done) {
    var pareTree = new PareTree();

    pareTree.add('test/*', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('*test/').length).to.be(1);

    done();
  });

  it('tests adding and finding a LP subscription', function (done) {
    var pareTree = new PareTree();

    pareTree.add('test/', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('*est/').length).to.be(1);

    done();
  });

  it('tests adding and finding a RL subscription', function (done) {

    var pareTree = new PareTree();

    pareTree.add('*test/', {key:'testKey1', data:{test:'data'}});

    pareTree.add('precise', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('tes*').length).to.be(1);

    done();
  });

  it('tests adding and finding a RR subscription', function (done) {

    var pareTree = new PareTree();

    pareTree.add('test/*', {key:'testKey1', data:{test:'data'}});

    pareTree.add('precise', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('tes*').length).to.be(1);

    done();
  });

  it('tests adding and finding a RP subscription', function (done) {

    var pareTree = new PareTree();

    pareTree.add('test', {key:'testKey1', data:{test:'data'}});

    pareTree.add('precise', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('tes*').length).to.be(1);

    done();
  });

  it('tests adding and finding a PL subscription', function (done) {

    var pareTree = new PareTree();

    pareTree.add('*test', {key:'testKey1', data:{test:'data'}});

    pareTree.add('precise', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('precisetest').length).to.be(1);

    done();
  });

  it('tests adding and finding a PR subscription', function (done) {

    var pareTree = new PareTree();

    pareTree.add('test*', {key:'testKey1', data:{test:'data'}});

    pareTree.add('precise', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('testprecise').length).to.be(1);

    done();
  });

  it('tests adding and finding a PP subscription', function (done) {

    var pareTree = new PareTree();

    pareTree.add('test', {key:'testKey1', data:{test:'data'}});

    pareTree.add('precise', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('test').length).to.be(1);

    done();
  });

  it('tests adding and finding subscriptions', function (done) {

    var pareTree = new PareTree();

    pareTree.add('test/*', {key:'testKey1', data:{test:'data'}});
    pareTree.add('*test/', {key:'testKey1', data:{test:'data'}});
    pareTree.add('*test/*', {key:'testKey1', data:{test:'data'}});
    pareTree.add('test/', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('test/*').length).to.be(4);
    expect(pareTree.search('*test/').length).to.be(4);
    expect(pareTree.search('*test/*').length).to.be(4);
    expect(pareTree.search('test/').length).to.be(4);

    done();
  });

  it('tests wildcard matching', function (done) {

    var pareTree = new PareTree();

    expect(pareTree.__wildcardMatch('/test*', '*/test')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/*/short', '/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/*', '/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/*/*/short', '/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test*', '/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('*/short', '/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test*/short', '/test/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/*/short', '/test/complex/and/long')).to.be(false);
    expect(pareTree.__wildcardMatch('/test/complex/*', '/blah/complex/and/short')).to.be(false);
    expect(pareTree.__wildcardMatch('/test/*/*/short', '/test/complex/and/long')).to.be(false);
    expect(pareTree.__wildcardMatch('/test*', '/tes/complex/and/short')).to.be(false);
    expect(pareTree.__wildcardMatch('*/short', '/test/complex/and/long')).to.be(false);
    expect(pareTree.__wildcardMatch('/test*/short', '/test/complex/and/short/')).to.be(false);
    expect(pareTree.__wildcardMatch('*hort', '/short*')).to.be(true);
    expect(pareTree.__wildcardMatch('*hort', '*/complex/short')).to.be(true);
    expect(pareTree.__wildcardMatch('*hort', '*/complex/short')).to.be(true);
    expect(pareTree.__wildcardMatch('*/short', '*/complex/and/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/*', '/test/comp*')).to.be(true);
    expect(pareTree.__wildcardMatch('/test*', '*test/com*')).to.be(true);
    expect(pareTree.__wildcardMatch('Nykqt0EWubC74J*', '*0EWubC74')).to.be(true);

    done();
  });

  it('tests the sorted object array', function (done) {

    var SortedObjectArray = require("../lib/sorted-array");

    var testSorted = new SortedObjectArray('size');

    var testRandomFirstIndexes = {};

    var index = 0;

    var TESTCOUNT = 20;

    var RANDOM_MAX = 10;

    for (var i = 0; i < TESTCOUNT; i++) {

      var last = random.integer(1, RANDOM_MAX);

      for (var ii = 0; ii < last; ii++) {

        var randomStrings = random.string({
          length: 20,
          count: last
        });

        index++;

        if (ii == 0) testRandomFirstIndexes[i] = last;

        testSorted.insert({
          size: i,
          subkey: randomStrings[ii]
        });
      }
    }

    Object.keys(testRandomFirstIndexes).forEach(function (key) {

      var searchedItems = testSorted.search(key);
      expect(searchedItems.length).to.be(testRandomFirstIndexes[key]);
    });

    var removeAllKey;
    var removeAtKey;
    var removeAtSubkey;

    Object.keys(testRandomFirstIndexes).every(function (key) {

      var searchedItems = testSorted.search(key);

      if (searchedItems.length > 1 && removeAllKey != null && removeAtKey == null) {
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

    var removeAtResult = testSorted.remove(removeAtKey, {
      'subkey': {
        $eq: removeAtSubkey
      }
    });

    var foundAtCountAfterRemove = testSorted.search(removeAtKey).length;

    expect(foundAtCount - 1).to.be(foundAtCountAfterRemove);

    done();

  });

  it('tests the wildcard search matching, where * is nothing', function (done) {
    var pareTree = new PareTree();
    expect(pareTree.__wildcardMatch('*te*st/mat', '*te*st*')).to.be(true);
    done();
  });

  it('tests the wildcard search matching, where * take place of actual characters', function (done) {

    var pareTree = new PareTree();

    expect(pareTree.__wildcardMatch('*', '*te*st*')).to.be(true);

    expect(pareTree.__wildcardMatch('*test/mat', '*te*st*')).to.be(true);
    //
    expect(pareTree.__wildcardMatch('*te*st*', '*test/mat')).to.be(true);
    //
    expect(pareTree.__wildcardMatch('*te*s*t*', '*test/mat')).to.be(true);

    expect(pareTree.__wildcardMatch('*e*ma*', '*test/mat')).to.be(true);

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

    expect(pareTree.__wildcardMatch('/test/match*', '/blah/match/*')).to.be(false);
    //right left
    expect(pareTree.__wildcardMatch('/test/mat*', '*test/match')).to.be(true);
    //precise left
    expect(pareTree.__wildcardMatch('*test/match', '/test/match')).to.be(true);
    //precise right
    expect(pareTree.__wildcardMatch('/test/mat*', '/test/match')).to.be(true);
    //left left
    expect(pareTree.__wildcardMatch('*/test/match', '*st/blah')).to.be(false);
    //left right
    expect(pareTree.__wildcardMatch('*test/match', '/test/mar*')).to.be(false);
    //right left
    expect(pareTree.__wildcardMatch('/test/mat*', '*test/march')).to.be(false);
    //precise left
    expect(pareTree.__wildcardMatch('*test/match', '/test/ma*rch')).to.be(false);
    //precise right
    expect(pareTree.__wildcardMatch('/test/mat*', '*test/march')).to.be(false);

    expect(pareTree.__wildcardMatch('*test/mat', '*pe*st*')).to.be(false);

    return done();
  });

});
