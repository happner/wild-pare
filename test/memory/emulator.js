var async = require('async')
  , wildpare = require('../../index')
  , random = require('../__fixtures/random')
  ;

function Emulator(config){

  if (!config) config = {};

  if (!config.treeCount) config.treeCount = 1;

  if (!config.eventTypes) config.eventTypes = [1,2,3,4,5,6,7,8,9,10];

  this.__config = config;

  this.__report = {};

  this.__trees = [];
}

Emulator.create = function(config){

  return new Emulator(config);
};

Emulator.prototype.message = function(message, override){

  console.log(message);
};

Emulator.prototype.initialize = function(callback){

  var _this = this;

  async.timesSeries(_this.__config.treeCount, function(time, timeCB){

    _this.__trees.push(wildpare.create());

    timeCB();

  }, function(e){

    console.log('calling back:::', e);
    callback(e);
  });
};

Emulator.prototype.start = function(eventsPerSec, callback, forcedError){

  var _this = this;

  try{

    if (typeof eventsPerSec == 'function') {

      callback = eventsPerSec;
      eventsPerSec = _this.__config.eventsPerSec;
    }

    if (_this.__stopped == false) return callback(new Error('already running'));

    if (!eventsPerSec) eventsPerSec = _this.__config.eventsPerSec;

    else _this.__config.eventsPerSec = eventsPerSec;

    _this.__report.started = Date.now();

    _this.__report.errored = false;

    _this.__report.valid = [];

    _this.__report.invalid = [];

    _this.__stopped = false;

    _this.__calledStartBack = false;

    async.whilst(

      function() { return !_this.__stopped; },

      function (eventsCB) {

        setTimeout(function() {

          var treeIndex = random.integer(0, _this.__trees.length - 1);

          var string = random.string({length:128});

          _this.__trees[treeIndex].add(string, {data:{test:string}});

          if(_this.__trees[treeIndex].search(string).length == 0){
            _this.__report.invalid.push('add of ' + string + ' did not work');
          }

          _this.__trees[treeIndex].remove(string);

          if(_this.__trees[treeIndex].search(string).length > 0){
            _this.__report.invalid.push('remove of ' + string + ' did not work');
          }

          console.log('event happened:::');

          eventsCB();

        }, 1000 / eventsPerSec);
      },

      function (err) {

        _this.message('paused or stopped:::', err);

        if (err) _this.__report.errored = err;

        _this.__report.ended = Date.now();

        _this.__stoppedHandler(err);
      }
    );

    callback();

  }catch(e){
    if (!_this.__calledStartBack) callback(e);
  }
};

Emulator.prototype.report = function(callback){

  var _this = this;

  _this.message('stopping:::');

  _this.stop(function(e){

    if (e) return callback(e);

    return callback(null, _this.__report);
  });
};

Emulator.prototype.stop = function(callback){

  this.__stoppedHandler = callback;

  this.__stopped = true;
};

Emulator.prototype.tearDown = function(callback){

  setTimeout(callback, 1000);
};

module.exports = Emulator;