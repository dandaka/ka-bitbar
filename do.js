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
