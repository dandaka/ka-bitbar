var url = 'http://kite4you.ru/windguru/online/weather_getdata_json.php?db=kitebeach';

var url2 = 'http://kite4you.ru/windguru/online/weather_getdata_json.php?db=lesnoe';

var url3 = 'https://beta.windguru.cz/258786';

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

var parseWindguruData = function(body) {
  $ = cheerio.load(body);
  var windguru_json_str = $('.spot-live-div').next('script').text().split('\n')[0].replace('var wg_fcst_tab_data_1 = ', '').slice(0, -1);
  var windguru_json = JSON.parse(windguru_json_str);
  return findPeaks(windguru_json);
}

var findPeaks = function(windguru_json) {
  var wspd, wspd_next, wspd_prev;
  var res = '';
  for (var i = 1; i < windguru_json.fcst[3].WINDSPD.length - 1; i++) {
    wspd = windguru_json.fcst[3].WINDSPD[i];
    wspd_next = windguru_json.fcst[3].WINDSPD[i+1];
    wspd_prev = windguru_json.fcst[3].WINDSPD[i-1];
    if(wspd >= PEAK_MIN && wspd >= wspd_next && wspd >= wspd_prev) {
      peaksTime.push(i);
      var temp = Math.round(windguru_json.fcst[3].TMP[i])+"°C";
      var gust = Math.round(windguru_json.fcst[3].GUST[i]);
      var wind = Math.round(wspd)+"–"+gust+" knots,";
      var weekday = WEEKDAYS[windguru_json.fcst[3].hr_weekday[i]];
      var time = windguru_json.fcst[3].hr_h[i] + ':00';
      var percp = windguru_json.fcst[3].APCP[i];
      var rainstr = rainStrFromPercipation(percp);
      var arrow = arrowFromDirection(windguru_json.fcst[3].WINDDIR[i], wspd);
      var cloudStr = cloudStrFromCover(windguru_json.fcst[3].HCDC[i], windguru_json.fcst[3].MCDC[i], windguru_json.fcst[3].LCDC[i]);
      res += weekday+' '+time+' '+arrow+' '+wind+" "+temp+rainstr+' '+cloudStr+'\n';
    }
  }
  res += 'Kitebeach WindGuru forecast|href=https://beta.windguru.cz/258786\n'
  return res;
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

async.parallel([
  function(callback) {
    // Get weather data from Kite4you: Kitebeach
    request({
      url: url,
      json: true
    }, function(error, response, body) {
       res = responseF(error, response, body, "Kitebeach");
       callback(null, res);
    });
  },
  function(callback) {
    // Get weather data from Kite4you: Lesnoe
    request({
      url: url2,
      json: true
    }, function(error, response, body) {
       res = responseF(error, response, body, "Lesnoe");
       callback(null, res);
    });
  },
  function(callback) {
    // Get forecast data from Windguru
    request({
      url: url3,
      gzip: true
    }, function (error, response, body) {
      var res = 'No data from Windguru';
      if (!error && response.statusCode === 200) {
        res = parseWindguruData(body);
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
