var unirest = require("unirest");

async function getWeather(city){
    var req = unirest("GET", "https://community-open-weather-map.p.rapidapi.com/weather");
    req.query({
        "q": city,
        "lat": "",
        "lon": "",
        "callback": "",
        "id": "",
        "units": "metric"
    });
    req.headers({
        "x-rapidapi-key": "3005c31d10msh2fa4415583a1e50p1a9e32jsnbc18f48c4d94",
        "x-rapidapi-host": "community-open-weather-map.p.rapidapi.com",
        "useQueryString": true
    });

    let p = new Promise((resolve, reject)=>{req.end(function (res) {
        if (res.error) reject(res.error);
        resolve(res.body);
    })});
    
    return await p;
}

exports.getWeather=getWeather;

require('yargs')
  .command(
    'c <city>',
    'Input city.',
    {},
    opts => getWeather(opts.city)
  ) .strict().argv;

