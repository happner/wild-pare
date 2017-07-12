<span style="font-size:128">&#191;</span> wild-pare
----------------

#### *Subscription based in-memory key/value store, optimised for wildcard searches*


Arbitrary wildcard searches in key/value stores are computationally expensive because of the amount of possible permutations for the wildcard, ie: searching for "/the/*" could return "/the/quick/red/fox" or "/the/slow/brown/cow" or "/the/other" etc. etc.. This issue is compounded when a subscription model is introduced, where the subscriptions are stored wildcard keys. A tree-like structure is essential if we want to avoid full list scans.

wild-pare is in-memory subscription store that does arbitrary wildcard searches quickly, by implementing [louis's binary search tree](https://github.com/louischatriot/node-binary-search-tree) and branching the data by the key length, branches that are based on key lengths greater than the query segment (be it wildcard or precise), are pared away from the search.

[Isaac's LRU cache](https://github.com/isaacs/node-lru-cache) is also used to speed up consecutive lookups on the same key.

#### still in development, so there be dragons...

#### abstract tree structure:

```
[root(bst*)]
    |_segment_length*(int)
        |_segment(string)
            |_subscription(obj)

```
- *bst = binary search tree
- *segment_length, the length of the actual key/wildcard part

#### example data structure:

```javascript
var pare_tree_pseudo_structure = {
     15:{                  //this key is skipped because it is longer than the 8 characters of the search
       "15_characters!!":[
        {key:"subscriber1", data:{test:"data0"}}
       ]
    },
    10:{
       "ten_chars*":[
        {key:"subscriber1", data:{
          "subscriptionId_01":{test:"data1"},
          "subscriptionId_02":{test:"data2"}
        }},
        {key:"subscriber2", data:{test:"data2"}}
       ]
    },
    6:{
       "6_char":[
        {key:"subscriber1", data:{test:"data4"}}
       ],
       "ten_c*":[
        {key:"subscriber2", data:{test:"data5"}}
       ]
    }
}
```
- based on the above structure, 6 subscriptions would have have happened, 3 for the path "ten_chars*", 2 for the same recipient ("subscriber1") but with different data, and 1 for a different recipient ("subscriber2")

```javascript

//as per test/func-pare-tree

var subscriptionTree = new PareTree();

    //add a subscription:

    var subscriptionReference = subscriptionTree.add('/a/precise/subscription', {key:'subscriber1', data:{some:{custom:"data"}}});

    //console.log(subscriptionReference) looks like:

    // {
    //   "id": "subscriber1&0&1&e8vj4zk8tdu&/a/precise/subscription"
    // }

    //query the tree:

    var queryResults = subscriptionTree.search('/a/precise/subscription');//or subscriptionTree.search({path:'/a/precise/subscription'})

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

    var removalResult = subscriptionTree.remove(subscriptionReference); // or subscriptionTree.remove({id:subscriptionReference.id}) or subscriptionTree.remove(subscriptionReference.recipient.path)

    //console.log(removalResult) looks like:

    // [
    //   {
    //     "id": "subscriber1&0&1&e9jj4zkaiew&/a/precise/subscription"
    //   }
    // ]

    //add a wildcard subscription, wildcards are the * character - wildcards allow for any amount of text, so the following are valid wildcard paths:
    // /a/wildcard/subscription/* or */wildcard/subscription* or */wildcard* or */wildcard*/subscription/*
    // and would all return for a search that looks like this: /a/wildcard/subscription/test

    //the following demonstrates adding these subscriptions, for 3 subscribers, 'subscriber2', 'subscriber3' and 'subscriber4'
    //NB - notice we are adding a duplicate subscription for */wildcard/subscription* subscriber2, but with different data

    //duplicateright wildcard
    var wildcardSubscriptionReference1 = subscriptionTree.add('/a/wildcard/subscription/*', {key:'subscriber2', data:{some:{custom:"data"}}});
    var wildcardSubscriptionReference1_same = subscriptionTree.add('/a/wildcard/subscription/*', {key:'subscriber2', data:{some:{custom:"other-data"}}});

    //a left wildcard
    var wildcardSubscriptionReference2 = subscriptionTree.add('*/wildcard/subscription/test', {key:'subscriber2', data:{some:{custom:"data"}}});

    //added duplicate complex wildcards, just different data - anything that is enclosed with 2 * is slow and should be used with care
    var wildcardSubscriptionReference3 = subscriptionTree.add('*/wildcard*', {key:'subscriber2', data:{some:{custom:"data"}}});
    var wildcardSubscriptionReference4 = subscriptionTree.add('*/wildcard*', {key:'subscriber2', data:{some:{custom:"other-data"}}});

    var wildcardSubscriptionReference5 = subscriptionTree.add('*/wildcard*', {key:'subscriber3', data:{some:{custom:"data"}}});

    var wildcardSubscriptionReference6 = subscriptionTree.add('*/wildcard*/subscription/*', {key:'subscriber4', data:{some:{custom:"data"}}});

    //we now search the tree
    var wildcardSearchResult = subscriptionTree.search('/a/wildcard/subscription/test');

    //we should get 5 results, one for each subscription path (we have 2 path/subscriber pairings on our inserts)

    // our search results should look something like this:

    // [
    //   {
    //     "refCount": 2,
    //     "data": {
    //       "subscriber2&2&1&e6pj4zju49o&/a/wildcard/subscription/*": {
    //         "some": {
    //           "custom": "data"
    //         }
    //       },
    //       "subscriber2&2&1&e6pj4zju49p&/a/wildcard/subscription/*": {
    //         "some": {
    //           "custom": "other-data"
    //         }
    //       }
    //     },
    //     "segment": 25,
    //     "path": "/a/wildcard/subscription/*",
    //     "complex": true,
    //     "key": "subscriber2"
    //   },
    //   {
    //     "refCount": 1,
    //     "data": {
    //       "subscriber2&1&1&e6pj4zju49q&*/wildcard/subscription/test": {
    //         "some": {
    //           "custom": "data"
    //         }
    //       }
    //     },
    //     "segment": 27,
    //     "path": "*/wildcard/subscription/test",
    //     "complex": false,
    //     "key": "subscriber2"
    //   },
    //   {
    //     "refCount": 2,
    //     "data": {
    //       "subscriber2&3&1&e6pj4zju49r&*/wildcard*": {
    //         "some": {
    //           "custom": "data"
    //         }
    //       },
    //       "subscriber2&3&1&e6pj4zju49s&*/wildcard*": {
    //         "some": {
    //           "custom": "other-data"
    //         }
    //       }
    //     },
    //     "segment": 11,
    //     "path": "*/wildcard*",
    //     "complex": true,
    //     "key": "subscriber2"
    //   },
    //   {
    //     "refCount": 1,
    //     "data": {
    //       "subscriber3&3&1&e6pj4zju49t&*/wildcard*": {
    //         "some": {
    //           "custom": "data"
    //         }
    //       }
    //     },
    //     "segment": 11,
    //     "path": "*/wildcard*",
    //     "complex": true,
    //     "key": "subscriber3"
    //   },
    //   {
    //     "refCount": 1,
    //     "data": {
    //       "subscriber4&3&1&e6pj4zju49u&*/wildcard*/subscription/*": {
    //         "some": {
    //           "custom": "data"
    //         }
    //       }
    //     },
    //     "segment": 26,
    //     "path": "*/wildcard*/subscription/*",
    //     "complex": true,
    //     "key": "subscriber4"
    //   }
    // ]

    //some sense checking:

    expect(wildcardSearchResult.length).to.be(5);

    expect(wildcardSearchResult[0].refCount).to.be(2);

    //demonstrates how custom data is managed and accessible in search results
    expect(wildcardSearchResult[0].data[wildcardSubscriptionReference1_same.id].some.custom).to.be("other-data");
    expect(wildcardSearchResult[0].data[wildcardSubscriptionReference1.id].some.custom).to.be("data");


    //NB - notice the refCount for the */wildcard/subscription* path is 2,
    // and the .data object has 2 properties, each matching the id of the consecutive almost identical subscriptions made
    // , you can see that the data has been stored twice - both values ready

    //Now lets remove the other subscriptions

    var removalResult1 = subscriptionTree.remove(wildcardSubscriptionReference1);

    var removalResult2 = subscriptionTree.remove(wildcardSubscriptionReference4);

    var removalResult3 = subscriptionTree.remove(wildcardSubscriptionReference5);

    //removalResults return with an array, containing an object/s that has only an id field
    //we return an array because the removal may have been by path
    expect(removalResult1[0].id).to.be(wildcardSubscriptionReference1.id);
    expect(removalResult2[0].id).to.be(wildcardSubscriptionReference4.id);
    expect(removalResult3[0].id).to.be(wildcardSubscriptionReference5.id);

    //Our list is now pruned:

    wildcardSearchResult = subscriptionTree.search('/a/wildcard/subscription/test');

    //we expect our returned list to look something like this:

    // NB notice how we still have a record for /a/wildcard/subscription/* - the refCount is now 1
    // and the custom data has only one property matching the unique subscription id.

    // [
    //   {
    //     "refCount": 1,
    //     "data": {
    //       "subscriber2&2&1&e82j4zk3q2x&/a/wildcard/subscription/*": {
    //         "some": {
    //           "custom": "other-data"
    //         }
    //       }
    //     },
    //     "segment": 25,
    //     "path": "/a/wildcard/subscription/*",
    //     "complex": true,
    //     "key": "subscriber2"
    //   },
    //   {
    //     "refCount": 1,
    //     "data": {
    //       "subscriber2&1&1&e82j4zk3q2y&*/wildcard/subscription/test": {
    //         "some": {
    //           "custom": "data"
    //         }
    //       }
    //     },
    //     "segment": 27,
    //     "path": "*/wildcard/subscription/test",
    //     "complex": false,
    //     "key": "subscriber2"
    //   },
    //   {
    //     "refCount": 1,
    //     "data": {
    //       "subscriber2&3&1&e82j4zk3q2z&*/wildcard*": {
    //         "some": {
    //           "custom": "data"
    //         }
    //       }
    //     },
    //     "segment": 11,
    //     "path": "*/wildcard*",
    //     "complex": true,
    //     "key": "subscriber2"
    //   },
    //   {
    //     "refCount": 1,
    //     "data": {
    //       "subscriber4&3&1&e82j4zk3q32&*/wildcard*/subscription/*": {
    //         "some": {
    //           "custom": "data"
    //         }
    //       }
    //     },
    //     "segment": 26,
    //     "path": "*/wildcard*/subscription/*",
    //     "complex": true,
    //     "key": "subscriber4"
    //   }
    // ]

    //some more sense checking:

    expect(wildcardSearchResult.length).to.be(4);

    expect(wildcardSearchResult[0].refCount).to.be(1);

    expect(wildcardSearchResult[0].data[wildcardSubscriptionReference1_same.id].some.custom).to.be("other-data");

    expect(wildcardSearchResult[0].data[wildcardSubscriptionReference1.id]).to.be(undefined);

    return done();

```

### installation instructions:

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