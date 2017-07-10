<tr><td><span style="font-size:128">&#191;</span></td><td style="vertical-align: bottom">wild-pare</td></tr>
----------------------------

Arbitrary wildcard searches in key/value stores are computationally intensive because of the amount of possible permutations for the wildcard, ie: searching for "/the/*" could return "/the/quick/red/fox" or "/the/slow/brown/cow" or "/the/other" etc. etc.. This issue is compounded when a subscription model is introduced, where the subscriptions are stored wildcard keys. A tree-like structure is essential if we want to avoid full list scans.

wild-pare is in-memory subscription store that does arbitrary wildcard searches quickly, by implementing [louis's binary search tree](https://github.com/louischatriot/node-binary-search-tree) and branching the data by the key length, branches that are based on key lengths greater than the query segment (be it wildcard or precise), are pared away from the search.

[Isaac's LRU cache](https://github.com/isaacs/node-lru-cache) is also used to speed up consecutive lookups on the same key.

### NB NB - still in development, unsubscribe not tested yet

####abstract tree structure:

```
[root(bst*)]
    |_segment_length*(int)
        |_segment(string)
            |_subscription(obj)

```
- *bst = binary search tree
- *segment_length, the length of the actual key/wildcard part

####example data structure:

```javascript
var pare_tree_structure = {
     15:{                  //this key is skipped because it is longer than the 8 characters of the search
       "15_characters!!":[
        {key:"subscriber1", data:{test:"data0"}}
       ]
    },
    10:{
       "ten_chars*":[
        {key:"subscriber1", data:{test:"data1"}},
        {key:"subscriber2", data:{test:"data2"}}
       ],
       "*en_chars*":[
        {key:"subscriber1", data:{test:"data3"}}
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
- based on the above structure, 4 subscriptions have happened:

```javascript

var PareTree = require('pare-tree');

var pareTree = new PareTree();

pareTree.add('15_characters!!', {key:'subscriber1', data:{test:"data0"}});
pareTree.add('ten_chars*', {key:'subscriber1', data:{test:"data1"}});
pareTree.add('ten_chars*', {key:'subscriber2', data:{test:"data2"}});
pareTree.add('*en_chars*', {key:'subscriber1', data:{test:"data3"}});
pareTree.add('6_char', {key:'subscriber1', data:{test:"data4"}});
pareTree.add('ten_c*', {key:'subscriber2', data:{test:"data"}});

var subscriptions = pareTree.search('ten_chars/all');

//we should get 4 subscriptions back that match the path, based on their subscriptions
expect(subscriptions).to.eql(
  [ {key:'subscriber1', data:{test:"data1"}, path:'ten_chars*'},
    {key:'subscriber1', data:{test:"data3"}, path:'*en_chars*'},
    {key:'subscriber2', data:{test:"data2"}, path:'ten_chars*'},
    {key:'subscriber2', data:{test:"data"}, path:'ten_c*'}
  ]
)

```

### installation instructions:

```bash

npm install wild-pare

run the tests locally:
git clone https://github.com/happner/wild-pare.git && cd wild-pare && npm install

mocha test/func
mocha test/perf

```

####performance:

Between 35000 and 40000 wildcard searches in a tree with 300000 subscription nodes in one second. On an i7 macbook pro, with 8GB memory:

```bash
//when running mocha test/perf, output
did 300000 wildcard inserts in 2570 milliseconds
did 30000 wildcard searches in 772 milliseconds, in a tree with += 300000 nodes.
```
