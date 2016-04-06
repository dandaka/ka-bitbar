var url = "http://kite4you.ru/windguru/online/weather_getdata_json.php?db=kitebeach";

var url2 = 'http://kite4you.ru/windguru/online/weather_getdata_json.php?db=lesnoe';

var url3 = 'https://beta.windguru.cz/258786';

var request = require("request");
var cheerio = require('cheerio');

var arrows = ['↑', '↖', '←', '↙', '↓', '↘', '→', '↗', '↑'];
var PEAK_MIN = 12; // Wind starts at 12 knots

var peaksTime = [];

var parseBody = function(body) {
  // Wind direction
  var dir_arrow = arrowFromDirection(body.wind_arrow);
  // Wind speed avg in knots
  var last_wind = body.wind_avg[body.wind_avg.length - 1][1];
  var wind_knots = Math.round(last_wind * 1.94384);
  // Temperature
  var last_temp = body.temp_avg[body.temp_avg.length - 1][1];
  console.log(dir_arrow + wind_knots);
  console.log('---');
  var online_text = body.kitebeach_online == 1 ? '' : ':thumbsdown:';
  console.log('Kitebeach '+dir_arrow + wind_knots + ' knots '+last_temp+' °C '+online_text);
  console.log('Kite4you.ru meteo stations|href=http://kite4you.ru/windguru/online/meteostations.php');
}

var responseF = function (error, response, body) {
  if (!error && response.statusCode === 200) {
    parseBody(body);
  } else {
    console.log("? kn");
    console.log('---');
    console.log(':thumbsdown: Error');
  }
};

// Get weather data from Kite4you
request({
  url: url,
  json: true
}, responseF);

var parseWindguruData = function(body) {
  $ = cheerio.load(body);
  var windguru_json_str = $('.spot-live-div').next('script').text().split('\n')[0].replace('var wg_fcst_tab_data_1 = ', '').slice(0, -1);
  var windguru_json = JSON.parse(windguru_json_str);
  console.log('Windguru ' + Math.round(windguru_json.fcst[3].WINDSPD[0]) + ' knots');
  findPeaks(windguru_json);
}

var findPeaks = function(windguru_json) {
  var wspd, wspd_next, wspd_prev;
  for (var i = 1; i < windguru_json.fcst[3].WINDSPD.length - 1; i++) {
    wspd = windguru_json.fcst[3].WINDSPD[i];
    wspd_next = windguru_json.fcst[3].WINDSPD[i+1];
    wspd_prev = windguru_json.fcst[3].WINDSPD[i-1];
    if(wspd > PEAK_MIN && wspd > wspd_next && wspd > wspd_prev) {
      //console.log(windguru_json.fcst[3].WINDSPD[i]);
      peaksTime.push(i);
      console.log("i="+i+" wspd="+wspd);
    }
  }
}

var arrowFromDirection = function(angle) {
  var dir_index = Math.round(angle/45);
  if (dir_index >= 8) {
    dir_index--;
  }
  return arrows[dir_index];
}

// Get forecast data from Windguru
request({
  url: url3,
  gzip: true
}, function (error, response, body) {
  if (!error && response.statusCode === 200) {
    parseWindguruData(body);
  }
})

/* Test of JSON loading
var path = require('path');
var filename = path.join(__dirname, 'response-k4y.json');
var f = require('fs').readFileSync(filename, 'utf8');
var jsontest = JSON.parse(f);

parseBody(jsontest);
*/
