// const axios = require('axios');
// const authData = require('./authData.json');

// const twitterApi = axios.create({
//     baseURL: 'https://api.twitter.com/2',
//     timeout: 1000,
//     headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//         'Authorization': `Bearer ${authData.access_token}`
//     }
// });

// setInterval(async () => {
//     try {
//       const userId = '1636325363897827332';
//       const response = await twitterApi.get(`/users/${userId}/tweets`);
//       const tweet = response.data;

//       console.log(tweet);
//     } catch (error) {
//       console.error(error);
//     }
//   }, 5000);

const needle = require('needle');
require('dotenv').config();
const fs = require('fs');

const streamURL = `https://api.twitter.com/2/tweets/search/stream?tweet.fields=entities,created_at,public_metrics&expansions=author_id`;
const options = {
    headers: {
        'Authorization': `Bearer ${process.env.BEARER_TOKEN}`
    }
};

// const stream = needle.get(streamURL, options);
const stream = needle.get(streamURL, {
    headers: {
        Authorization: `Bearer ${process.env.BEARER_TOKEN}`
    }
})


async function doRetweet(user_id, tweet_id, access_token) {
    await needle('post', `https://api.twitter.com/2/users/${user_id}/retweets`,
        {
            "tweet_id": tweet_id
        }
        , {
            headers: {
                "Content-Type": 'application/json',
                Authorization: `Bearer ${access_token}`
            }
        }).then(function (res) {
            console.log("rt head", res?.headers)
            console.log("rt body", res?.body)
        }).catch(function (err) {
            console.log('rt error', err)
        });
}

async function doLike(user_id, tweet_id, access_token) {
    await needle('post', `https://api.twitter.com/2/users/${user_id}/likes`,
        {
            tweet_id
        },
        {
            headers: {
                "Content-Type": 'application/json',
                Authorization: `Bearer ${access_token}`
            }
        }).then(function (res) {
            console.log("like head", res?.headers)
            console.log("like body", res?.body)
        }).catch(function (err) {
            console.log('like error', err)
        });
}

async function doComment(tweet_id, access_token, address) {
    await needle('post', 'https://api.twitter.com/2/tweets',
        {
            text: address,
            reply: {
                "in_reply_to_tweet_id": tweet_id
            }
        },
        {
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        }).then(function (res) {
            console.log("comment headers", res?.headers)
            console.log("comment body", res?.body)
        }).catch(function (err) {
            console.log('comment error', err)
        });
}


stream.on('data', async (data) => {
    try {
        let authData;
        let listAddress;
        const datas = await new Promise((resolve, reject) => {
            fs.readFile('./authData.json', 'utf8', (err, datas) => {
                if (err) reject(err);
                resolve(datas);
            });
        });
        const addressDatas = await new Promise((resolve, reject) => {
            fs.readFile('./listAddress.json', 'utf8', (err, datas) => {
                if (err) reject(err);
                resolve(datas);
            });
        });
        listAddress = addressDatas;
        authData = JSON.parse(datas);
        const json = JSON.parse(data);
        const { id } = json.data;

        // authData.data.forEach((el, i) => {
        //     let userTweet = listAddress[el.username];
        //     if (userTweet) {
        //         doRetweet(el.id, id, el.access_token);
        //         doLike(el.id, id, el.access_token);
        //         doComment(id, el.access_token, userTweet);
        //     }
        // })

        const promises = authData.data.map(async (el, i) => {
            let userTweet = listAddress[el.username];
            if (userTweet) {
                await doRetweet(el.id, id, el.access_token);
                await doLike(el.id, id, el.access_token);
                await doComment(id, el.access_token, userTweet);
            }
        });

        await Promise.all(promises);

        console.log(json);
    } catch (error) {
        if (data.status === 401) {
            console.log(data);
            process.exit(1);
        } else if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
            console.log(data.detail)
            process.exit(1)
        } else {
            // Keep alive signal received. Do nothing.
            console.log("error", error);
        }
    }
    // console.log('Received data:', JSON.parse(data));
});

process.on('exit', () => {
    stream.request.abort()
    console.log("process.exit() method is fired on exit")
    process.exit()
})
process.on('SIGINT', () => {
    stream.request.abort()
    console.log("process.exit() method is fired on SIGINT")
    process.exit()
})