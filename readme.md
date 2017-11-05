<span style="font-size:128">&#191;</span> wild-pare
----------------

#### *Subscription based in-memory key/value store, optimised for wildcard or glob searches for nodejs*


Arbitrary glob or wildcard searches in key/value stores are computationally expensive because of the amount of possible permutations for the wildcard, ie: searching for "/the/*" could return "/the/quick/red/fox" or "/the/slow/brown/cow" or "/the/other" etc. etc.. This issue is compounded when a subscription model is introduced, where the subscriptions are stored wildcard keys. A tree-like structure is essential if we want to avoid full list scans.

What this library is good at:
- For storing subscriptions with wildcards or glob patterns /test/subscription/*, and searching using non-wildcard queries: /test/subscription/1

wild-pare is in-memory subscription store that does arbitrary wildcard searches quickly, by implementing [louis's binary search tree](https://github.com/louischatriot/node-binary-search-tree) and branching the data by the key length, branches that are based on key lengths greater than the query segment (be it wildcard or precise), are pared away from the search.

[Isaac's LRU cache](https://github.com/isaacs/node-lru-cache) is also used to speed up consecutive lookups on the same key. Mcollina's [hyperid](https://github.com/mcollina/hyperid) was adapted to run on node versions 0.10 - 8 and included locally - as the unique id generation for creating subscriptions was the biggest performance hurdle. To all those people whose libraries I have adapted - thank you.

#### abstract tree structure:

```
[root(bst*)]
    |_segment_length*(int)
        |_segment(string)
            |_subscription(obj)

```
- *bst = binary search tree
- *segment_length, the length of the actual key/wildcard part

#### quickstart

```bash

npm i wild-pare --save

```

```javascript

//glob subscriptions:

var PareTree = require('wild-pare');

var subscriptionTree = new PareTree(); //for glob matches, for simple wildcard matches new PareTree({mode:'wildstring'})
//in wildstring mode /te/* wil match /te/st/1, glob mode the / means something

var subscriptionRef1 = subscriptionTree.add('/a/*/**', {
  key: 'subscriber1',//your subscriber key must be unique to top level subscriber
  data: {some: {custom: "data"}, value: 12}//this is data you wish to store or filter by
});

  //returns:

  // {
  //   "id": [generated unique id]
  // }

  var queryResults1 = subscriptionTree.search('/a/subscription/path/1');

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
  //     "id": [generated unique id]
  //   }
  // ]


  //add another subscription to the same path but with different data:

  var subscriptionRef2 = subscriptionTree.add('/a/*/**', {
    key: 'subscriber2',
    data: {some: {custom: "data"}, value: 6}
  });

  //query the tree:

  var queryResults2 = subscriptionTree.search('/a/subscription/path');

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
  //     "id": [generated unique id]
  //   },
  //   {
  //     "key": "subscriber2",
  //     "data": {
  //       "some": {
  //         "custom": "data"
  //       },
  //       "value": 6
  //     },
  //     "id": [generated unique id]
  //   }
  // ]

  //REMOVE SUBSCRIPTIONS:

  //remove a subscription, returns array containing subscription ids removed in {id:[id]} objects:

  var removalResult = subscriptionTree.remove(subscriptionRef1); // or subscriptionTree.remove({id:subscriptionReference.id}) or subscriptionTree.remove(subscriptionReference.recipient.path)

  //returns an array of the deleted subscriptions:

//   {
//     "key": "subscriber1",
//     "data": {
//       "some": {
//         "custom": "data"
//       },
//       "value": 12
//     },
//     "id": [generated unique id]
//   }


  //you can also remove all subscriptions matching a path, regardless of what subscriber:
  subscriptionTree.remove({path:'/a/*/**'});

  //and you can also remove all matching subscriptions for a specific subscriber only
  subscriptionTree.remove({path:'/a/*/**', key:'subscriber2'});

  //NB - unexpected behaviour alert: only wildcard paths exactly matching the above path will be removed, so although the path appears to contain wildcards it is matched precisely against existing subscription paths, so only subscriptions with /a/*/** are removed, a subscription like this /a/1/2 will remain


```

### installation instructions in more detail:

```bash

npm install wild-pare

run the tests locally:
git clone https://github.com/happner/wild-pare.git && cd wild-pare && npm install

mocha test

#### supported node versions:

v0.10 - v8

#### caveats

- the library is synchronous (blocking) - be aware of this in high-volume environments, I am thinking of an async version that stores data on file, making this a database of sorts.