describe('unit', function () {

  this.timeout(5000);

  var expect = require('expect.js');

  var shortid = require('shortid');

  var random = require('./__fixtures/random');

  var PareTree = require('..');

  function getTree(){
    return PareTree.create();
  }

  it('tests adding and finding a PR subscription', function (done) {

    var pareTree = getTree();

    pareTree.add('test*', {key:'testKey1', data:{test:'data'}});

    pareTree.add('precise', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('testprecise').length).to.be(1);

    done();
  });

  it('tests adding and finding a PP subscription', function (done) {

    var pareTree = getTree();

    pareTree.add('test', {key:'testKey1', data:{test:'data'}});

    pareTree.add('precise', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('test').length).to.be(1);

    done();
  });

  it('tests adding and finding subscriptions', function (done) {

    var pareTree = getTree();

    pareTree.add('test/*', {key:'testKey1', data:{test:'data'}});
    pareTree.add('test/', {key:'testKey1', data:{test:'data'}});
    pareTree.add('tes*/**', {key:'testKey1', data:{test:'data'}});
    pareTree.add('test/', {key:'testKey1', data:{test:'data'}});
    pareTree.add('*', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('test/1').length).to.be(3);
    expect(pareTree.search('tester/').length).to.be(2);

    done();
  });

  it('tests wildcard matching', function (done) {

    var pareTree = getTree();

    expect(pareTree.__wildcardMatch('/test/1', '/te*/*')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/match', '/test/mat*')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/and/short','/test/complex/*/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/and/short','/test/complex/**')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/and/short', '/test/*/*/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/and/short', '/test/**')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/and/short','/test/**/short')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/complex/and/long','/test/complex/*/short')).to.be(false);
    expect(pareTree.__wildcardMatch('/blah/complex/and/short', '/test/complex/*')).to.be(false);
    expect(pareTree.__wildcardMatch('/test/complex/and/long', '/test/*/*/short')).to.be(false);
    expect(pareTree.__wildcardMatch('/tes/complex/and/short', '/test*')).to.be(false);
    expect(pareTree.__wildcardMatch('/test/complex/and/short/', '/test/**/short*')).to.be(true);
    expect(pareTree.__wildcardMatch('/test/comp/**', '/test/**')).to.be(true);

    done();
  });

  it('tests removing subscriptions by id', function (done) {

    var pareTree = getTree();

    pareTree.add('test', {key:'testKey1', data:{test:'data'}});

    var toRemoveRef = pareTree.add('test', {key:'testKey2', data:{test:'data'}});

    var found = pareTree.search('test');

    expect(found.length).to.be(2);

    expect(pareTree.remove(toRemoveRef).length).to.be(1);

    found = pareTree.search('test');

    expect(found.length).to.be(1);

    done();

  });

  it('tests removing subscriptions by none-wild-card path', function (done) {

    var pareTree = getTree();

    pareTree.add('test1', {key:'testKey1', data:{test:'data'}});

    pareTree.add('tes*', {key:'testKey2', data:{test:'data'}});

    var found = pareTree.search('test1');

    expect(found.length).to.be(2);

    expect(pareTree.remove('test1').length).to.be(1);

    found = pareTree.search('test');

    expect(found.length).to.be(1);

    done();
  });

  it('tests removing subscriptions by wild-card path', function (done) {

    var pareTree = getTree();

    pareTree.add('test', {key:'testKey1', data:{test:'data'}});

    pareTree.add('tes*', {key:'testKey2', data:{test:'data'}});

    var found = pareTree.search('test');

    expect(found.length).to.be(2);

    expect(pareTree.remove('tes*').length).to.be(1);

    found = pareTree.search('test');

    expect(found.length).to.be(1);

    done();
  });

  it('tests removing subscriptions by subscriber', function (done) {

    var pareTree = getTree();

    pareTree.add('tes*', {key:'testKey1', data:{test:'data'}});

    pareTree.add('te*', {key:'testKey2', data:{test:'data'}});

    pareTree.add('t*', {key:'testKey3', data:{test:'data'}});

    var found = pareTree.search('test');

    expect(found.length).to.be(3);

    expect(pareTree.remove({key:'testKey3'}).length).to.be(1);

    found = pareTree.search('test');

    expect(found.length).to.be(2);

    done();
  });

  it('tests removing subscriptions by path and subscriber', function (done) {

    var pareTree = getTree();

    pareTree.add('te*', {key:'testKey1', data:{test:'data'}});

    pareTree.add('test*', {key:'testKey2', data:{test:'data'}});

    pareTree.add('test*', {key:'testKey3', data:{test:'data'}});

    pareTree.add('test1', {key:'testKey3', data:{test:'data'}});

    var found = pareTree.search('test1');

    expect(found.length).to.be(4);

    expect(pareTree.remove({key:'testKey3', path:'test*'}).length).to.be(1);

    found = pareTree.search('test1');

    expect(found.length).to.be(3);

    done();

  });

  it('tests filtering a search for subscriptions', function (done) {

    var pareTree = getTree();

    pareTree.add('test1', {key:'testKey1', data:{test:'data'}});

    pareTree.add('test*', {key:'testKey2', data:{test:'data'}});

    pareTree.add('te*', {key:'testKey3', data:{test:'data'}});

    pareTree.add('t*', {key:'testKey3', data:{test:'data'}});

    var found = pareTree.search('test1', {filter:{key:'testKey3'}});

    expect(found.length).to.be(2);

    found = pareTree.search('test1');

    expect(found.length).to.be(4);

    pareTree.add('t*', {key:'testKey3', data:{test:'data', value:3}});

    found = pareTree.search('test1', {filter:{'data.value':{'$gte':3}}});

    expect(found.length).to.be(1);

    done();
  });

  it('tests adding and finding and removing subscriptions', function (done) {

    var pareTree = getTree();

    pareTree.add('test/*', {key:'testKey1', data:{test:'data'}});
    pareTree.add('test/', {key:'testKey1', data:{test:'data'}});
    pareTree.add('tes*/**', {key:'testKey1', data:{test:'data'}});
    pareTree.add('test/', {key:'testKey1', data:{test:'data'}});
    pareTree.add('*', {key:'testKey1', data:{test:'data'}});

    expect(pareTree.search('test/1').length).to.be(3);
    expect(pareTree.search('tester/').length).to.be(2);

    pareTree.remove({key:'testKey1', path:'*'});

    expect(pareTree.search('test/1').length).to.be(2);
    expect(pareTree.search('tester/').length).to.be(1);

    pareTree.remove({path:'test/*'});

    expect(pareTree.search('test/1').length).to.be(1);

    done();
  });

  it('tests adding and finding and removing subscriptions on 2 trees', function (done) {

    var pareTree1 = getTree();
    var pareTree2 = getTree();

    pareTree1.add('test/*', {key:'testKey1', data:{test:'data'}});
    pareTree2.add('test/*', {key:'testKey1', data:{test:'data'}});

    expect(pareTree1.search('test/1').length).to.be(1);
    expect(pareTree2.search('test/1').length).to.be(1);

    pareTree1.remove({key:'testKey1', path:'test/*'});

    expect(pareTree1.search('test/1').length).to.be(0);
    expect(pareTree2.search('test/1').length).to.be(1);

    done();

  });

});
