const { workerData, parentPort } = require('worker_threads');
const request = require('request');
const { Client } = require('pg');

const config = workerData;

const db = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: config.appMode !== 'dev'
});

db.connect(err => {
	if (err) {
	  console.error('db connection error', err.stack)
	} else {
	  console.log('connected to db')
	}
});
db.on('error', err => console.log('ERR|> ', err));

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
	return sendMessage(slackMessage, { text }, true);
}

function getRotaData() {
	console.log('getRotaData');
	return new Promise((resolve, reject) => {
		console.log('pre db query');
		db.query('SELECT row_data FROM rota_data WHERE row_id=1;', (err, res) => {
			console.log('getRotaData res', res);
			if (err) {
				reject(err);
				throw err;
			}
			const data = res.rows[0].row_data;
			resolve(JSON.parse(data));
		});
		console.log('post db query');
	});
}

function updateRotaData(dataObj) {
	return new Promise((resolve, reject) => {
		const text = 'UPDATE rota_data SET row_data = ($2) WHERE row_id=($1)';
		const values = [1, JSON.stringify(dataObj)];

		db.query(text, values)
			.then(res => {
				resolve(console.log('data posted to endpoint!'));
			})
			.catch(e => reject(e.stack))
	});
}

function generateRandomMessage(id, pro, pos) {

	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	const messages = [
        `${id} was originally planning on going to fight some horses at the Extinction Rebellion protests, but ${pro} remembered ${pro} is absolutely terrified of horses and it is ${pos} turn at standup today.`,
        `If ${id} gets back from the radiator museum in time ${pro} will be doing today's standup`,
        `Get out of bed and face the day, ${id} will do a standup soon and has demanded that everyone is completely awake and upright and also please no moths allowed, only team memebers thanks`,
        `Make sure today's socks are are at least fairly robust, and have full elastical integrity (FULL), because ${id} will do the stand up this morning`,
        `Deep beneath the Earth's core, occasionally sinister Godwit farmer and retired mercenary ${id} first learnt to play the flute. It took over fourteen years, and today we will find out if it was worth it, or just a massive massive waste of time.`,
        `If only there were a way to report simulation bugs to our ineffable alien overlords. I really want to know why I couldn't find both socks this morning. Oh ${id} does a full standup today.`,
        `One must resolve oneself to one's cosmic insignificance in order to be a true standupperer. Fortunately ${id} was born fully aware of ${pos} insignificance, having been raised in a sensory deprivation tank for the first 79 years of ${pos} life.`,
        `Convicted felon and volunrary garden gnome collector ${id} listened to a bagpipe for over three minutes last week and is therefore entirely qualified to give a standup at us this morning without causing undue suffering.`,
        `I went to see ${id} give a talk about how to practice the surreptitious ownership of a voluntary carpark last night and I have absolutely no idea what is was about or if ${pro} has just gone mad, but we will find out in this morning's standup.` ,
        `Today you are presented with an opportunity to study the apparent nature of your existence, and if other people actually exist outside of your fevered little mind. ${id} told me this morning that ${pro} has empirical evidence of the physical existence of the universe, so that should be fun`,
        `When I was a boy, I often dreamt of working in a custard factory. Did you know there are apprenticeships you can do - oh wait ${id} just told me to shut it because ${pro} is doing a standup in a minute and needs to find ${pos} spare socks`,
        `A cat on both of my arms would be less expensive than th- Oh, hello, ${id} for the standup today thanks`,
        `I hope you're wearing an empty nappy, because ${id} is doing a standup today! :happy-sad:`,
		`Put some seatbealts on your ears, because ${id} is totally going to take them on an epic journey in today's standup`,
		`${id} is going to make you question the futility of your own existence in today's standup`,
		`Clear your diaries because ${id} is going to standup at you today, and it doesn't get much better than that! :excited:`,
		`Future ${id} just appeared in a dustbin and told me that past ${id} did the best most amazing standup this morning, so make sure you're wearing socks.`,
        `The seat of your trousers are going to be thinner and more strained than that teabag that I saw Tom punching the other day, becasue ${id} is going to do a standup! :tea:`,
        `Are you feeling uncomfortable today, and shifting about awkwardly, like a rusty gearbox? Me too. My shoes used to be made of cats though. ${id} today for a standup! ${pro} would never wear cat shoes.`,
		`Imagine a moth doing a standup! How rubbish would that be! Luckily ${id} is doing it today, and not a moth. `,
		`Last time ${id} did a standup, my socks fell off and I had a dream about plums. So I'm looking forward to this morning. :happy-sad:`,
		`Last time Rakesh pushed me down the stairs, ${id} came to me in a dream and said don't worry. One day I will be doing a standup and you will forget about your broken legs. ${id} we love you. :boxing_glove:`,
		`Have you forgotten the sensation of joy? Have you woken up today feeling like a wooden ladder? Don't worry, ${id} will run today's standup and we are all going to feel good again.`,
		`Make standups great again, ${id}! Bless your tiny tiny miraculous face`,
		`${id} is doing a standup today, and after that big fight ${pro} had on the train this morning, it should be a lively one :ballmer:`,
		`${id} is doing the full standup experience today, remember not to mention how ${pro} tried to force Jovi to live in the fridge for a week, we're not supposed to mention that. :jackfruit:`,
		`All the rumours about ${id} are untrue, ${pro} is doing a standup this morning, and isn't even allergic to eggs, and wants everyone to know ${pro} has never even been to a B&Q anyway. :egg:`,
		`Remember the last time ${id} did the standup, and there was a big fight at the end, and Dmitry took his shoes off and chased everyone until they died. I think it probably won't be that good today. :dmitryk:`,
		`I heard ${id} was caught trying to iron a homeless dog this morning. I hope ${pro} is still OK to do the standup.`,
		`When ${id} does the standup it feels like you are slipping into an enormous warm quiche, and before long you start wishing you had been born this way, why why was I born this way?`,
		`${id} has a voice like a beautiful warm wind farm, and today we are going to be filled with renewable energy, after today's STANDUP!`,
		`Take me far away, and put some cheese in my ears, because ${id} is doing the standup today. I am filled with dread.`,
		`Whenever ${id} does the standup, my feet shift uncomfortably, like an embarrassed gearbox. But it is not from boredom, or guilt, or worrying about that unresolved blood debt. It's because ${id} has a voice like a bassoon.`,
		`:cat2: is doing a standup this morning. Oh wait it's ${id} I think. Not :cat2: who is a cat and therefore a total dumbo. :happy-sad:`,
		`In addition to running standup today, ${id} will also be inspecting every team member's socks :socks:`
	];

	return messages[getRandomInt(0, messages.length - 1)];
}

class WhosNext {
	constructor(slackMessage) {
		this.people = [
		{
			name: 'Tim',
			username: '<@U0J5A4F35>',
            pro: 'he',
            pos: 'his'
		},
		{
			name: 'Jon S.',
			username: '<@U7JSC2P9S>',
            pro: 'he',
            pos: 'his'
		},
		{
			name: 'Jon Y.',
			username: '<@U0GM3HM4J>',
            pro: 'he',
            pos: 'his'
		},				
		{
			name: 'Tom',
			username: '<@U14GHSETH>',
            pro: 'he',
            pos: 'his'
		},
		{
			name: 'Leandro',
			username: '<@UCJLAS1QE>',
            pro: 'he',
            pos: 'his'
		},		
		{
			name: 'Priyo',
			username: '<@U4416LBJL>',
            pro: 'he',
            pos: 'his'
		},
		{
			name: 'Hilverd :hilverd:',
			username: '<@U0GDK2ETF>',
            pro: 'he',
            pos: 'his'
		},
		{
			name: 'Ed',
			username: '<@U0GE0LM1U>',
            pro: 'he',
            pos: 'his'
		},
		{
			name: 'Alexis',
			username: '<@UQR8HQS11>',
            pro: 'he',
            pos: 'his'
		},
		{
			name: 'Antonio',
			username: '<@U011RGV305C>',
            pro: 'he',
            pos: 'his'
		}	
		];
		this.nonWeekDays = [6, 0]; // Saturday (6) and Sunday (0)
		this.nonWorkDates = ['Fri Apr 10 2020', 'Mon Apr 13 2020', 'Mon May 8 2020', 'Mon May 25 2020', 'Fri Dec 25 2020', 'Mon Dec 28 2020']; // Public holidays and one-off out of office dates
		this.dailyAlertTime24h = '0830';
		this.rotaIndex = 0;
		this.slackMessage = slackMessage.command;
		this.requester = slackMessage.requester;
	}

	async showName() {
		const today = new Date();
		const isTodayWeekend = this.nonWeekDays.includes(today.getDay());
		const isTodayOfficeHoliday = this.nonWorkDates.includes(today.toDateString());

		if (!isTodayWeekend && !isTodayOfficeHoliday) {
			const person = await this._getActivePerson();
			console.log('person: ', person);
			const msgTxt = generateRandomMessage(`*${person.name}* (${person.username})`, person.pro, person.pos);
			console.log('msgTxt: ', msgTxt);
			const blocks = [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: msgTxt
					}
				},
				{
					"type": "actions",
					"elements": [
						{
							"type": "button",
							"text": {
								"type": "plain_text",
								"text": config.skipButtonMessage,
								"emoji": true
							}
						}
					]
				}
			];

			if (this.requester) {
				blocks.push({
					"type": "context",
					"elements": [
						{
							"type": "mrkdwn",
							"text": `${this.requester} skipped to the next person.`
						}
					]
				});
			}

			// Used for the notifications on desktop or mobile
			const text = msgTxt;

			return sendMessage(this.slackMessage, { blocks, text });
		} else {
			const text = 'No standup today :sleeping: :palm_tree:';
			return sendMessage(this.slackMessage, {
				blocks: [{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text
					}
				}], text
			});
		}
	}

	async skip() {
		console.log('Skipped! Show next member');
		return this.showName();
	}

	async _getActivePerson() {
		let index = 0;

		console.log('_getActivePerson');
		return await getRotaData().then(fileData => {
			const numberOfPeople = this.people.length - 1;
			const rotaPositionIndex = fileData.rotaIndex;
			const dateLastUpdated = fileData.date;
			const today = new Date().toDateString();

			
			// if (today === dateLastUpdated) {
			if (fileData) {
				index = rotaPositionIndex;
			}
				
			console.log('index: ', index);
			console.log('numberOfPeople: ', numberOfPeople);
			updateRotaData({
				rotaIndex: index >= numberOfPeople ? 0 : parseInt(index, 10) + 1,
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

function skip(slackMessage) {
	const who = new WhosNext(slackMessage);
	return who.skip();
}

function handle(slackMessage) {
	if (slackMessage.command.startsWith('today')) {
		return rota(slackMessage).catch(handleError);
	} else if (slackMessage.command.startsWith('skip')) {
		skip(slackMessage).catch(handleError);
	} else {
		sendEphemeralMessage(slackMessage, 'Invalid command').catch(handleError);
	}
}

parentPort.on('message', handle);

module.exports = handle;
