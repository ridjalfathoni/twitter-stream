const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const filePath = path.join(__dirname, "authData.json");

const token = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
console.log("token", token);
const twitterApi = axios.create({
    baseURL: 'https://api.twitter.com/2',
    timeout: 1000,
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${token}`
    }
});

(async () => {
    const authData = require('./authData.json');
    let tmpData = [];
    const promises = authData.data.map(async (el, i) => {
        try {
          const res = await twitterApi.post('/oauth2/token', {
            refresh_token: el.refresh_token,
            grant_type: 'refresh_token'
          });
          el.access_token = res.data.access_token;
          el.refresh_token = res.data.refresh_token;
          tmpData.push(el);
          console.log('Element:', el);
        } catch (err) {
          console.error('Error:', err);
        }
      });
    
    await Promise.all(promises);
    console.log("nrp", tmpData);
    fs.writeFile(filePath, JSON.stringify({data:tmpData}), err => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Data written to file');
    });
})()