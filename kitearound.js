var url = "http://kite4you.ru/windguru/online/weather_getdata_json.php?db=kitebeach";

var url2 = 'http://kite4you.ru/windguru/online/weather_getdata_json.php?db=lesnoe';

var url3 = 'https://beta.windguru.cz/258786';

var request = require("request");
var cheerio = require('cheerio');

var arrows = ['↑', '↖', '←', '↙', '↓', '↘', '→', '↗'];

var parseBody = function(body) {
  // Wind direction
  var dir = body.wind_arrow;
  var dir_index = Math.round(dir/45);
  if (dir_index >= 8) {
    dir_index--;
  }
  var dir_arrow = arrows[dir_index];
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
    console.log('Error');
  }
};

request({
  url: url,
  json: true
}, responseF);

request({
  url: url3,
  gzip: true
}, function (error, response, body) {
  if (!error && response.statusCode === 200) {
    $ = cheerio.load(body);
    var windguru_json_str = $('.spot-live-div').next('script').text().split('\n')[0].replace('var wg_fcst_tab_data_1 = ', '').slice(0, -1);
    var windguru_json = JSON.parse(windguru_json_str);
    console.log('Windguru ' + Math.round(windguru_json.fcst[3].WINDSPD[0]) + ' knots');
  }
})

/* Test of JSON loading
var path = require('path');
var filename = path.join(__dirname, 'response-k4y.json');
var f = require('fs').readFileSync(filename, 'utf8');
var jsontest = JSON.parse(f);

parseBody(jsontest);
*/
