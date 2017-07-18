<span style="font-size:128">&#191;</span> wild-pare
----------------

#### *Subscription based in-memory key/value store, optimised for wildcard searches*


Arbitrary wildcard searches in key/value stores are computationally expensive because of the amount of possible permutations for the wildcard, ie: searching for "/the/*" could return "/the/quick/red/fox" or "/the/slow/brown/cow" or "/the/other" etc. etc.. This issue is compounded when a subscription model is introduced, where the subscriptions are stored wildcard keys. A tree-like structure is essential if we want to avoid full list scans.

wild-pare is in-memory subscription store that does arbitrary wildcard searches quickly, by implementing [louis's binary search tree](https://github.com/louischatriot/node-binary-search-tree) and branching the data by the key length, branches that are based on key lengths greater than the query segment (be it wildcard or precise), are pared away from the search.

[Isaac's LRU cache](https://github.com/isaacs/node-lru-cache) is also used to speed up consecutive lookups on the same key. Mcollina's [hyperid](https://github.com/mcollina/hyperid) was adapted for 0.10 support - as the unique id generation for creating subscriptions was the biggest performance hurdle.

#### abstract tree structure:

```
[root(bst*)]
    |_segment_length*(int)
        |_segment(string)
            |_subscription(obj)

```
- *bst = binary search tree
- *segment_length, the length of the actual key/wildcard part


#### still in development, so there be dragons...

#### quickstart

```bash

npm i wild-pare --save

```

```javascript

var PareTree = require('wild-pare');

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

  //query the tree:

  var queryResults2 = subscriptionTree.search('/a/subscription/path');//or subscriptionTree.search({path:'/a/subscription/path'})

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


```

### installation instructions in more detail:

```bash

npm install wild-pare

run the tests locally:
git clone https://github.com/happner/wild-pare.git && cd wild-pare && npm install

mocha test

```

#### performance:

Between 25000 and 40000 wildcard searches in a tree with 300000 subscription nodes in one second. On an i7 macbook pro, with 8GB memory:

```bash
//when running mocha test/perf, output

did 300000 wildcard inserts in 2744 milliseconds
did 30000 wildcard searches in 872 milliseconds, in a tree with += 300000 nodes.

did 300000 precise inserts in 2562 milliseconds
did 30000 precise searches in 138 milliseconds, in a tree with += 300000 nodes.
```

#### caveats

- subscriptions that enclose the path with wildcards, ie \*/a/test/subscription/\* will possibly perform slower, because they are stored and searched through in a different manner and will always involve regex comparisons.
- although it is very fast, the library is synchronous (blocking) - be aware of this in high-volume environments, I am thinking of an asynch version that stores data on file, making this a database of sorts.