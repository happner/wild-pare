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

var subscriptionRef1= subscriptionTree.add('/a/subscription/path', {key:'subscriber1', data:{some:{custom:"data"}, value:12}});

var queryResults = subscriptionTree.search('/a/subscription/path');//or subscriptionTree.search({path:'/a/precise/subscription'})

//should be
// [
//   {
//     "refCount": 1,
//     "data": {
//       "subscriber1&0&1&e99j4zk9onq&/a/precise/subscription": {
//         "some": {
//           "custom": "data"
//         }
//       }
//     },
//     "segment": 23,
//     "path": "/a/precise/subscription",
//     "key": "subscriber1"
//   }
// ]

//add another subscription to the same path but with different data:

var subscriptionRef2 = subscriptionTree.add('/a/subscription/path', {key:'subscriber1', data:{some:{custom:"data"}}, value:6});

//console.log(subscriptionReference) looks like:

// {
//   "id": "subscriber1&0&1&e8vj4zk8tdu&/a/precise/subscription"
// }

//query the tree:

var queryResults = subscriptionTree.search('/a/subscription/path');//or subscriptionTree.search({path:'/a/subscription/path'})

expect(queryResults.length).to.be(1);

//console.log(queryResults) looks like:

// [
//   {
//     "refCount": 1,
//     "data": {
//       "subscriber1&0&1&e99j4zk9onq&/a/precise/subscription": {
//         "some": {
//           "custom": "data"
//         }
//       }
//     },
//     "segment": 23,
//     "path": "/a/precise/subscription",
//     "key": "subscriber1"
//   }
// ]

//remove a subscription:

var removalResult = subscriptionTree.remove(subscriptionRef1); // or subscriptionTree.remove({id:subscriptionReference.id}) or subscriptionTree.remove(subscriptionReference.recipient.path)

//console.log(removalResult) looks like:

// [
//   {
//     "id": "subscriber1&0&1&e9jj4zkaiew&/a/precise/subscription"
//   }
// ]

//add a wildcard subscription, wildcards are the * character - wildcards allow for any amount of text, so the following are valid wildcard paths:
// /a/wildcard/subscription/* or */wildcard/subscription* or */wildcard* or */wildcard*/subscription/*
// and would all return for a search that looks like this: /a/subscription/path

//right wildcard:

var wildcardRightRef = subscriptionTree.add('/a/subscription/*', {key:'subscriber2', data:{some:{custom:"data"}}, value:5});

//left wildcard:

var wildcardLeftRef= subscriptionTree.add('*/subscription/path', {key:'subscriber2', data:{some:{custom:"data"}}, value:15});

//now a query like this:

queryResults = subscriptionTree.search({path:'/a/subscription/*', filter:{key:'subscriber2'}});//only subscriber2's subscriptions

//returns:

//filtering data, using mongo-style syntax:

queryResults = subscriptionTree.search({path:'/a/subscription/*', filter:{key:'subscriber2'}});//only subscriber2's subscriptions

//returns:

//you can also filter by the subscription data

queryResults = subscriptionTree.search({path:'/a/subscription/*', filter:{$lte:["data.value",10]}});//only subscriptions with a data.value less than 10

//returns:



//NB NB but be aware that previous data lives in an object keyed by the subscription id, so is not easily addressed in a filter, ie:


```

### installation instructions in more detail:

```bash

npm install wild-pare

run the tests locally:
git clone https://github.com/happner/wild-pare.git && cd wild-pare && npm install

mocha test/func
mocha test/perf

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

- subscriptions that enclose the path with wildcards, ie \*/a/test/subscription/\* will possibly perform slower, because they are stored and searched through in a different manner.