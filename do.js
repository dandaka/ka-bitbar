var async = require('async');
var isOnline = require('is-online');

async.during(
  function (callback) {
    isOnline(function(err, online) {
      callback(err, !online);
    });
  },
  function (callback) {
    console.log('we are not online');
    setTimeout(callback, 3000);
  },
  function (err) {
    console.log('we are online');
  }
);

// isOnline(onlineCallback);

/*
async.during(
  function (callback) {
    console.log('test if true? '+(count < 5));
    return callback(null, count < 5);
  },
  function (callback) {
    console.log('increase count');
    count++;
    setTimeout(callback, 1000);
  },
  function (err) {
    console.log('5 seconds have passed');
  }
);
*/