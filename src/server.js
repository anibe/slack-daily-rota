const {
	Worker
} = require('worker_threads');
const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser')

dotenv.config();

const config = {
	slackToken: process.env.SLACK_TOKEN,
	slackOAuthToken: process.env.SLACK_OAUTH_TOKEN,
	slackClientId: process.env.SLACK_CLIENT_ID,
	slackClientSecret: process.env.SLACK_CLIENT_SECRET,
	port: process.env.PORT
};

const worker = new Worker('./src/worker.js', {workerData: config});
worker.on('error', (error) => {
	throw error;
});
worker.on('exit', (code) => {
	if (code !== 0)
		throw new Error(`Worker stopped with exit code ${code}`);
});

const app = express();
app.use(bodyParser.urlencoded({
	extended: true
}));

app.post('/rota', (req, res) => {
	if (req.body) {
		console.log('Received request', req.body);
	}

	if (!req.body || req.body.token !== config.slackToken) {
		return res.status(401).send('Invalid credentials');
	}

	if (req.body.text.match(/today|skip/) !== null) {
		const slackMessage = req.body;

		res.status(200).end();

		worker.postMessage(slackMessage);
	} else {
		res.json(
			{
				response_type: 'ephemeral',
				text: `Invalid command: \`${req.body.text}\``
			}
		);
	}
});

// app.post('/whosnext', (req, res) => {
// 	if (req.body) {
// 		console.log('Received request', req.body);
// 	}

// 	if (!req.body || req.body.token !== config.slackToken) {
// 		return res.status(401).send('Invalid credentials');
// 	}
	
// 	worker.postMessage(slackMessage);
// });

module.exports = {
	app,
	config
};
