var url = 'http://kite4you.ru/windguru/online/weather_getdata_json.php?db=kitebeach';

var url2 = 'http://kite4you.ru/windguru/online/weather_getdata_json.php?db=lesnoe';

var url3 = 'https://beta.windguru.cz/258786';

var url4 = 'http://magicseaweed.com/Zelenogradsk-Surf-Report/4518/';

var async = require('async');
var request = require('request');
var cheerio = require('cheerio');

var arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘',  '↓'];
var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var PEAK_MIN = 12; // Wind starts at 12 knots

var peaksTime = [];

var parseBody = function(body, station_name) {
  var res = '';
  // Wind speed avg in knots
  var last_wind = body.wind_avg[body.wind_avg.length - 1][1];
  var wind_knots = Math.round(last_wind * 1.94384);
  // Wind direction
  var dir_arrow = arrowFromDirection(body.wind_arrow, wind_knots);
  // Temperature
  var last_temp = body.temp_avg[body.temp_avg.length - 1][1];
  // Online or not?
  if (station_name == 'Kitebeach') {
    var online_status = body.kitebeach_online;
  } else {
    var online_status = body.lesnoe_online;
  }
  var online_text = online_status == 1 ? '' : ':thumbsdown:';
  var online_text_toolbar = online_status == 1 ? '' : ' :(';
  if (station_name == 'Kitebeach') {
    res += dir_arrow + wind_knots + online_text_toolbar + '\n';
    res += '---\n'
  }
  res += station_name+' '+dir_arrow + wind_knots + ' knots '+last_temp+' °C '+online_text + '\n';
  if (station_name != 'Kitebeach') {
    res += 'Kite4you.ru meteo stations|href=http://kite4you.ru/windguru/online/meteostations.php' + '\n';
    res += '---' + '\n';
  }
  return res;
}

var responseF = function (error, response, body, station_name) {
  if (!error && response.statusCode === 200) {
    return parseBody(body, station_name);
  } else {
    return 'Error';
  }
};

var WAVE_MIN = 0.5;

var findPeaksMSW = function(json) {
  var wh, wh_next, wh_prev;
  var nowTimeStamp = Math.floor(Date.now() / 1000);
  var res = '';
  console.log("items count "+json.run.length);
  for(var i=1; i < json.run.length - 1; i++) {
    // Only 5 days are valid
    if (json.run[i].localTimestamp - nowTimeStamp > (5*24*60*60)) {
      break;
    }
    wh = json.run[i].swell.height;
    wh_prev = json.run[i-1].swell.height;
    wh_next = json.run[i+1].swell.height;
    if(wh >= WAVE_MIN && wh >= wh_next && wh >= wh_prev) {
      var date = dateFromTimeStamp(json.run[i].localTimestamp);
      res += date + " " + wh + " m waves";
    }
  }
  res += 'MSW forecast|href=http://magicseaweed.com/Zelenogradsk-Surf-Report/4518/\n';
  return res;
}

var dateFromTimeStamp = function(timeStamp) {
  return '';
}

var rainStrFromPercipation = function(percipation) {
  var rainstr = '';
  if (percipation > 0.2 && percipation < 1.5) {
    rainstr += ', '+percipation + ' mm/3h';
  }
  return rainstr;
}

var cloudStrFromCover = function(high, mid, low) {
  var c = '';
  var allclouds = high + mid + low;
  if (allclouds > 150) {
    c += ':cloud:';
  } else if (allclouds < 50) {
    c += ':sunny:';
  }
  return c;
}

var arrowFromDirection = function(angle, windspeed) {
  if (windspeed < 2) {
    return '⌀';
  }
  var dir_index = Math.round(angle/45);
  if (dir_index >= 8) {
    dir_index--;
  }
  return arrows[dir_index];
}

var parseMSWData = function(body) {
  $ = cheerio.load(body);
  var msw_json = $('#msw-js-fcc').data('chartdata');
  return findPeaksMSW(msw_json);
}

async.parallel([
  function(callback) {
    // Get weather data from MSW Zelenogradsk
    request({
      url: url4
    }, function(error, response, body) {
       var res = 'No data from MSW';
       if (!error && response.statusCode === 200) {
         res = parseMSWData(body);
       }
       callback(null, res);
    });
  }
], function (err, results) {
  for (var i = 0; i < results.length; i++) {
    console.log(results[i]);
  }
});

/* Test of JSON loading
var path = require('path');
var filename = path.join(__dirname, 'response-k4y.json');
var f = require('fs').readFileSync(filename, 'utf8');
var jsontest = JSON.parse(f);

parseBody(jsontest);
*/
