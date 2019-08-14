const {workerData, parentPort} = require('worker_threads');
const request = require('request');
const fetch = require("node-fetch");

const config = workerData;

function sendMessage(slackMessage, payload, isEphemeral = false) {
	const requestBody = {
		...payload,
		channel: slackMessage.channel_id
	};

	if (isEphemeral) {
		requestBody.user = slackMessage.user_id;
	}

	return new Promise((resolve, reject) => {
		request.post({
			url: isEphemeral ? 'https://slack.com/api/chat.postEphemeral' : config.slackHookUrl,
			json: true,
			body: requestBody,
			headers: {
				'Content-type': 'application/json',
				'Authorization': `Bearer ${config.slackOAuthToken}`
			}
		}, (error, response, responseBody) => {
			if (error) {
				reject(error);
				return;
			} else if (!responseBody.ok) {
				reject('error', responseBody.error);
				return;
			}

			resolve(responseBody);
		});
	});
}

function sendEphemeralMessage(slackMessage, text) {
	return sendMessage(slackMessage, {text}, true);
}

function getRotaData() {
	return new Promise((resolve, reject) => {
		fetch(config.getRotaUrl)
			.then(response => {
				return response.json();
			})
			.then(data => {
				console.log(data);
				resolve(data);
			}).catch(err => {
				reject(err);
			});
	});	
}

function updateRotaData(dataObj) {
	console.log('dataObj', dataObj);
	return new Promise((resolve, reject) => {
		fetch(config.updateRotaUrl, {
			method: 'POST',
			body: JSON.stringify(dataObj),
			headers: {
				'Content-Type': 'application/json'
			}
		}).then(() => {
			resolve(console.log('data saved to file!'))
		}).catch(e => {
			reject(e);
		});
	});
}

function generateRandomMessage(id) {

	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	const messages = [
		`Get ready ${id} ! You're running stand-up today :wiggle_cat:`,
		`Hey ${id} guess what? It's your turn to run stand-up today! :100:`,
		`Prepare for an epic stand-up, run by ${id} today :muscle:`,
		`Grab your laptop ${id} and get ready to shine :sparkles:`,
	];

	return messages[getRandomInt(0, messages.length - 1)];
}

class WhosNext {
	constructor(slackMessage) {
		this.people = [{
			name: 'Colleen',
			username: '<@colleen.mckeever>'
		},
		{
			name: 'Marleen',
			username: '<@marleen>'
		},
		{
			name: 'Amit',
			username: '<@amit gupta>'
		},
		{
			name: 'Tom',
			username: '<@tombarnsbury>'
		},
		{
			name: 'Priyo',
			username: '<@priyoaujla>'
		},
		{
			name: 'Rakesh',
			username: '<@rakesh.sharma>'
		},
		{
			name: 'Dmitry',
			username: '<@dmitrykandalov>'
		},
		{
			name: 'Jon S.',
			username: '<@Jon>'
		},
		{
			name: 'Anibe',
			username: '<@anibe>'
		},
		{
			name: 'Mirren',
			username: '<@Mirren>'
		},
		{
			name: 'Isabel',
			username: '<@Isabel Buettner>'
		}];
		this.nonActiveDays = [6, 0]; // Saturday (6) and Sunday (0)
		this.dailyAlertTime24h = '0830';
		this.rotaIndex = 0;
		this.slackMessage = slackMessage;
	}

	async showName() {
		const isTodayNonActiveDay = this.nonActiveDays.includes(new Date().getDay());
		if (!isTodayNonActiveDay) {
			const person = await this._getActivePerson();
			const msgTxt = generateRandomMessage(person.username);
			const blocks = [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: msgTxt
					}
				}
			];
	
			// Used for the notifications on desktop or mobile
			const text = msgTxt;

			return sendMessage(this.slackMessage, {blocks, text});			
		} else {
			console.log('not an active day');
			const text = 'Today is not an active workday :sleeping:';
			return sendMessage(this.slackMessage, {blocks: [{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text
				}
			}], text});
		}
	}

	skip() {
		// TODO		
	}

	_getActivePerson() {
		let index = 0;

		return getRotaData().then(fileData => {
			const numberOfPeople = this.people.length - 1;
			const rotaPositionIndex = fileData.rotaIndex;
			const dateLastUpdated = fileData.date;
			const today = new Date().toDateString();

			if (today === dateLastUpdated) {
				index = rotaPositionIndex;
			}

			updateRotaData({
				rotaIndex: numberOfPeople === index ? 0 : parseInt(index, 10) + 1,
				date: today
			});
			return this.people[index];
		}).catch(e => {
			console.log('unable to get active person', e);
		});
	}
}

function handleError(e) {
	console.trace({
		message: e,
		originalError: e
	});
}

function rota(slackMessage) {
	const who = new WhosNext(slackMessage);
	return who.showName();
}

function handle(slackMessage) {
	if (slackMessage.text.startsWith('today')) {
		rota(slackMessage).catch(handleError);
	} else if (slackMessage.text.startsWith('skip')) {
		rota(slackMessage).catch(handleError);
	} else {
		sendEphemeralMessage(slackMessage, 'Invalid command').catch(handleError);
	}
}

parentPort.on('message', handle);

module.exports = handle;
