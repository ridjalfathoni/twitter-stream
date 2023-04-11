const express = require('express');
const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, "authData.json");
const querystring = require('querystring');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3030;

let authData = require('./authData.json');

const twitterApi = axios.create({
    baseURL: 'https://api.twitter.com/2',
    timeout: 1000,
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    auth: {
        username: process.env.CLIENT_ID,
        password: process.env.CLIENT_SECRET
    },
});

app.listen(port, () => {
    console.log(`Listening at ${port}`);
});

const redirectToTwitterAuth = async (req, res, next) => {
    try {
        const config = {
            params: {
                response_type: 'code',
                client_id: process.env.CLIENT_ID,
                redirect_uri: 'http://localhost:3000/twitterAuth',
                scope: 'tweet.read tweet.write users.read offline.access like.read like.write ',
                state: 'state',
                code_challenge: 'challenge',
                code_challenge_method: 'plain'
            }
        }

        const response = await axios.get('https://twitter.com/i/oauth2/authorize', config);
        res.redirect(response.request.res.responseUrl);
    } catch (error) {
        next(error);
    }
}

app.use('/twitterAuthorize', redirectToTwitterAuth);

app.use('/twitterAuth', async (req, res, next) => {
    try {
        const { code } = req.query;
        console.log('Code:', code);

        const data = querystring.stringify({
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: 'http://localhost:3000/twitterAuth',
            code_verifier: 'challenge'
        });

        const response = await twitterApi.post('/oauth2/token', data);
        console.log('Response:', response.data);
        const dataUser = await  axios.get(`https://api.twitter.com/2/users/me`, {
            headers: {
                Authorization: `Bearer ${response.data.access_token}`
            }
        })
        console.log("data", dataUser.data.data.id);
        response.data.id = dataUser.data.data.id;
        response.data.username = dataUser.data.data.username;
        const index = _.findIndex(authData.data, {username: dataUser.data.data.username});
        if (index != -1) {
            authData.data.splice(index,1);
        }
        authData.data.push(response.data);
        
        // console.log("auth", authData);
        fs.writeFile(filePath, JSON.stringify(authData), err => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('Data written to file');
        });
        res.send("ok");
    } catch (error) {
        console.error('Error:', error.message);
        next(error);
    }
});
