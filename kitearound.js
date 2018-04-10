var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var isOnline = require('is-online');
// var config = require('config');
var fs = require('fs');

var urlMeteoKB = 'http://kite4you.ru/windguru/online/weather_getdata_json.php?db=kitebeach';
var urlMeteoLesnoe = 'http://kite4you.ru/windguru/online/weather_getdata_json.php?db=lesnoe';
var urlMeteoBaltiysk = 'http://kite4you.ru/windguru/online/weather_getdata_json.php?db=baltiysk';
var urlWindguruZelenogradsk = 'https://www.windguru.cz/124096';
var urlWGZelenogradskJSON = 'http://www.windguru.cz/int/widget_json.php?callback=jQuery183014162597187889658_1523358123268&url=file%3A%2F%2F%2FUsers%2Fdandaka%2Fprojects%2Fka-bitbar%2Fwidget.html&hostname=&s=124096&m=3&lng=en&_=1523358123301';
var url4 = 'http://magicseaweed.com/Zelenogradsk-Surf-Report/4518/';
var urlWindguruGo = 'https://beta.windguru.cz/?set=138877';
var urlZelenogradskCam = 'http://kgd.ru/traffic/camera/18-zelenogradsk-plyazh';
var urlLesnoeCam = 'http://cammeteo.ru/cam31';
var windguruStationApi = 'https://www.windguru.cz/int/wgsapi.php';
var svenceleStation = 'https://beta.windguru.cz/station/316';

var ARROWS = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘',  '↓'];
var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var PEAK_MIN = 12; // Wind starts at 12 knots
var WAVE_MIN = 0.5; // Waves less than 0.5 m does not matter

var peaksTime = [];

async.during(
  // Check if we have an online connection
  function (callback) {
    isOnline(function(err, online) {
      callback(err, !online);
    });
  },
  // If not, wait 3 seconds and repeat
  function (callback) {
    setTimeout(callback, 3000);
  },
  // We have a connection
  function (err) {
    getData();
  }
);

var getData = function() {
  async.parallel([
    function(callback) {
      // Get weather data from Kite4you: Kitebeach
      request({
        url: urlMeteoKB,
        json: true
      }, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          res = responseF(error, response, body, "Kitebeach");
        }
        callback(null, res);
      });
    },
    function(callback) {
      // Get weather data from Kite4you: Lesnoe
      request({
        url: urlMeteoLesnoe,
        json: true
      }, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          res = responseF(error, response, body, "Lesnoe");
        }
        callback(null, res);
      });
    },
    // function(callback) {
    //   // Get weather data from Kite4you: Baltiysk
    //   request({
    //     url: urlMeteoBaltiysk,
    //     json: true
    //   }, function(error, response, body) {
    //     if (!error && response.statusCode === 200) {
    //       res = responseF(error, response, body, "Baltiysk");
    //     }
    //     callback(null, res);
    //   });
    // },
    function(callback) {
      // Get forecast data from Windguru
      request({
        url: urlWGZelenogradskJSON,
        gzip: true
      }, function (error, response, body) {
        var res = 'No data from Windguru';
        if (!error && response.statusCode === 200) {
          // res = parseWindguruData(body);
          res = parseWindguruJSON(body);
        }
        callback(null, res);
      });
    },
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
    // Output all results
    for (var i = 0; i < results.length; i++) {
      console.log(results[i]);
    }
    console.log(staticLinks());
  });
}

var parseKite4you = function(body, station_name) {
  var res = '';
  // Wind speed last average in meters, convert to knots
  // Last value is momentary (not average), so we take 2nd last
  if(body.wind_avg !== undefined) {
    var last_wind = body.wind_avg[body.wind_avg.length - 2][1];
  } else {
    return 'K4Y is down\n---\n';
  }
  var wind_knots = Math.round(last_wind * 1.94384);
  // Wind direction
  var dir_arrow = arrowFromDirection(body.wind_arrow, wind_knots);
  // Temperature
  var last_temp = Math.round(body.temp_avg[body.temp_avg.length - 2][1]);
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
  res += station_name+' '+dir_arrow + wind_knots + ' knots, '+last_temp+' °C '+online_text + '\n';
  res += '---\n';
  return res;
}

var responseF = function (error, response, body, station_name) {
  if (!error && response.statusCode === 200) {
    return parseKite4you(body, station_name);
  } else {
    return 'Error';
  }
}

var parseWindguruJSON = function(body) {
  var firstBracket = body.indexOf('(') + 1;
  var lastBracket = body.length - 1;
  var windguru_json_str = body.substring(firstBracket, lastBracket);
  if (windguru_json_str != '') {
    var windguru_json = JSON.parse(windguru_json_str);
    return findPeaksWindGuru(windguru_json);
  } else {
    return 'WindGuru parse error';
  }
}

var findPeaksWindGuru = function(windguru_json) {
  var wspd, wspd_next, wspd_prev;
  var res = '';
  var forecastData = windguru_json.fcst.fcst[3];

  for (var i = 1; i < forecastData.WINDSPD.length - 1; i++) {
    wspd = forecastData.WINDSPD[i];
    wspd_next = forecastData.WINDSPD[i+1];
    wspd_prev = forecastData.WINDSPD[i-1];

    if(wspd >= PEAK_MIN && wspd >= wspd_next && wspd >= wspd_prev) {
      peaksTime.push(i);
      var temp = Math.round(forecastData.TMP[i])+"°C";
      var gust = Math.round(forecastData.GUST[i]);
      var wind = Math.round(wspd)+"–"+gust+" knots,";
      if (forecastData.hr_weekday[i] != undefined) {
        var weekday = WEEKDAYS[forecastData.hr_weekday[i]];
      } else {
        var weekday = '?';
      }

      var time;
      if (forecastData.hr_h[i] != undefined) {
        // Correct time for 1h (Kaliningrad is 1 hour behind Moscow)
        if (forecastData.hr_h[i] == "00") {
          time = "23:00";
        } else {
          time = (Number(forecastData.hr_h[i]) - 1) + ':00';
        }
      } else {
        time = '?'
      }
      var percp = forecastData.APCP[i];
      var rainstr = rainStrFromPercipation(percp);
      var arrow = arrowFromDirection(forecastData.WINDDIR[i], wspd);
      var cloudStr = cloudStrFromCover(forecastData.HCDC[i], forecastData.MCDC[i], forecastData.LCDC[i]);
      res += weekday+' '+time+' '+arrow+' '+wind+" "+temp+rainstr+' '+cloudStr+'\n';
    }
  }
  res += '---\n';
  return res;
}

var rainStrFromPercipation = function(percipation) {
  var rainstr = '';
  if (percipation > 0.2) {
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
  return ARROWS[dir_index];
}

var findPeaksMSW = function(json) {
  var wh, wh_next, wh_prev;
  var nowTimeStamp = Math.floor(Date.now() / 1000);
  var res = '';
  res += '---\n';
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
      res += date + ", " + wh + " m waves\n";
    }
  }
  return res;
}
var parseMSWData = function(body) {
  $ = cheerio.load(body);
  var msw_json = $('#msw-js-fcc').data('chartdata');
  if (msw_json != undefined) {
    return findPeaksMSW(msw_json);
  } else {
    return "MSW parse failed :(";
  }
}

var dateFromTimeStamp = function(timeStamp) {
  var d = new Date(timeStamp*1000);
  return dateFormat(d, "ddd HH:MM");
}

var testJSONLoad = function() {
  var path = require('path');
  var filename = path.join(__dirname, 'response-k4y.json');
  var f = require('fs').readFileSync(filename, 'utf8');
  var jsontest = JSON.parse(f);
  parseBody(jsontest);
}

var staticLinks = function() {
  var res;
  res = 'Kite4you.ru meteo stations|href=http://kite4you.ru/windguru/online/meteostations.php' + '\n';
  res += 'Baltiysk meteo station|href=https://beta.windguru.cz/station/686' + '\n';
  res += 'Zelenogradsk beach web camera|href=' + urlZelenogradskCam + '\n';
  res += 'Lesnoe beach web camera|href=' + urlLesnoeCam + '\n';
  res += 'Kitebeach WindGuru forecast|href='+urlWindguruGo+'\n';
  res += 'Zelenogradsk MSW forecast|href=http://magicseaweed.com/Zelenogradsk-Surf-Report/4518/\n';
  res += '---' + '\n';
  return res;
}