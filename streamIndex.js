const needle = require('needle');
const dotenv = require('dotenv');
const fs = require('fs/promises');

dotenv.config();

const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=entities,created_at,public_metrics&expansions=author_id';

const options = {
    headers: {
        Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
    },
};

const stream = needle.get(streamURL, options);

async function doRetweet(user_id, tweet_id, access_token) {
    try {
        const res = await needle('post', `https://api.twitter.com/2/users/${user_id}/retweets`, {
            tweet_id,
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${access_token}`,
            },
        });
        console.log('rt head', res?.headers);
        console.log('rt body', res?.body);
    } catch (err) {
        console.log('rt error', err);
    }
}

async function doLike(user_id, tweet_id, access_token) {
    try {
        const res = await needle('post', `https://api.twitter.com/2/users/${user_id}/likes`, {
            tweet_id,
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${access_token}`,
            },
        });
        console.log('like head', res?.headers);
        console.log('like body', res?.body);
    } catch (err) {
        console.log('like error', err);
    }
}

async function doComment(tweet_id, access_token, address) {
    try {
        const res = await needle('post', 'https://api.twitter.com/2/tweets', {
            text: address,
            reply: {
                in_reply_to_tweet_id: tweet_id,
            },
        }, {
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('comment headers', res?.headers);
        console.log('comment body', res?.body);
    } catch (err) {
        console.log('comment error', err);
    }
}

async function processData(data) {
    try {
        const authData = JSON.parse(await fs.readFile('./authData.json', 'utf8'));
        const listAddress = JSON.parse(await fs.readFile('./listAddress.json', 'utf8'));

        const json = JSON.parse(data);
        const { id } = json.data;

        const promises = authData.data.map(async (el) => {
            const { id: user_id, username, access_token } = el;
            const userTweet = listAddress[username];

            if (userTweet) {
                await doRetweet(user_id, id, access_token);
                await doLike(user_id, id, access_token);
                await doComment(id, access_token, userTweet);
            } else {
                console.log('gagal');
            }
        });

        await Promise.all(promises);

        console.log('kelar');
    } catch (error) {
        if (error.status === 401) {
            console.log(error);
            process.exit(1);
        } else if (error.detail === 'This stream is currently at the maximum allowed connection limit.') {
            console.log(error.detail);
            process.exit(1);
        } else {
            console.log('error', error);
        }
    }
}

stream.on('data', processData);

process.on('exit', () => {
    stream.request.abort();
    console.log('process.exit() method is fired on exit');
    process.exit();
});

process.on('SIGINT', () => {
    stream.request.abort();
    console.log('process.exit() method is fired on SIGINT');
    process.exit();
});