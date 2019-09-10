let express = require('express'),
	bodyParser = require('body-parser'),
	path = require('path'),
	app = express(),
	expressValidator = require('express-validator'),
	mongojs = require('mongojs'),
	db = mongojs('lucky4Life', ['userEntry', 'winningEntry']),
	ObjectId = mongojs.ObjectId,
	totalCost = 0,
	totalWon = 0,
	failNum = false,
	failDupNums = false,
	minimumPayoutMap = {
		two: 3,
		lB: 4,
		lBOne: 6,
		three: 20,
		lBTwo: 25,
		lBThree: 150,
		four: 200,
		lBFour: 5000,
		fiveLife: 25000 * 20,
		lBFiveLife: 365000 * 20
	},
	matchMap = [],
	dateMap = {};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
	res.locals.errors = null;
	next();
});

app.use(expressValidator({
	errorFormatter: (param, msg, value) => {
		let namespace = param.split('.'),
			root = namespace.shift(),
			formParam = root;
		while (namespace.length) {
			formParam += `[${namespace.shift()}]`;
		}
		return {
			param: formParam,
			msg: msg,
			value: value
		}
	}
}));

function buildMatchMap (mUN, mWN) {
	matchMap.push([`Your Numbers: ${mUN[0]}`, `Matching Numbers: ${mWN[0]}`, `Draw Date: ${mWN[1]}`]);
}

function getMatches (userHist, winHist) {
	if (userHist.length > 0 && winHist.length > 0) {
		userHist.forEach(item => {
			winHist.forEach(cell => {
				if (item[1] === cell[1]) {
					let uItem = item[0].split(',').map(Number),
						wItem = cell[0].split(',').map(Number),
						matchCount = 0,
						luckyMatch = false;
					uItem.forEach((userNum, i) => {
						wItem.forEach((winNum, j) => {
							if (i === 5 && j === 5) {
								if (uItem[i] === wItem[j]) {
									luckyMatch = true;
								}
							} else if (i < 5 && j < 5) {
								if (uItem[i] === wItem[j]) {
									matchCount++;
								}
							}
						});
					});
					if (luckyMatch) {
						if (matchCount === 0) {
							totalWon += minimumPayoutMap.lB;
						} else if (matchCount === 1) {
							totalWon += minimumPayoutMap.lBOne;
						} else if (matchCount === 2) {
							totalWon += minimumPayoutMap.lBTwo;
						} else if (matchCount === 3) {
							totalWon += minimumPayoutMap.lBThree;
						} else if (matchCount === 4) {
							totalWon += minimumPayoutMap.lBFour;
						} else if (matchCount === 5) {
							totalWon += minimumPayoutMap.lBFiveLife;
						}
						buildMatchMap(item, cell);
					} else if (matchCount >= 2) {
						if (matchCount === 2) {
							totalWon += minimumPayoutMap.two;
						} else if (matchCount === 3) {
							totalWon += minimumPayoutMap.three;
						} else if (matchCount === 4) {
							totalWon += minimumPayoutMap.four;
						} else if (matchCount === 5) {
							totalWon += minimumPayoutMap.fiveLife;
						}
						buildMatchMap(item, cell);
					}
				}
			});
		});
	}
}

function convertDate(date) {
	let splitD = date.split('-'),
		newView = `${splitD[1]}-${splitD[2]}-${splitD[0]}`;
	return newView;
}

function renderView (req, res, errors) {
	totalWon = 0,
	matchMap = [],
	dateMap = {};

	db.entries.find((err, docs) => {
		let numHist = docs.map(item => {
			return [item.numArr, convertDate(item.date), item._id, item.isUser];
		}),
			userHist = [],
			winHist = [],
			matching = [],
			recent = '';
		numHist.forEach(item => {
			if (item[3]) {
				userHist.push(item);
			} else {
				winHist.push(item);
				dateMap[item[1]] = item[1];
			}
		});

		getMatches(userHist, winHist);

		totalCost = userHist.length * 2;

		return res.render('index', {
			userHist: userHist,
			winHist: winHist,
			totalCost: totalCost,
			totalWon: totalWon,
			errors: errors,
			matchMap: matchMap
		});
	});
}

function newEntryScrubber (numStr, dupObj, winDate) {
	if (winDate) {
		for (date in dateMap) {
			if (date === convertDate(winDate)) {
				failNum = true;
			}
		}
	}
	let numConv = numStr.split(',').map(Number);
	numConv.forEach((num, i) => {
		if (isNaN(num)) {
			failNum = true;
		} else if (i === numConv.length - 1) {
			if (num > 18) {
				failNum = true;
			}
		} else if (num > 48) {
			failNum = true;
		}
		if (i < 5) {
			if (!dupObj[num]) {
				dupObj[num] = num;
			} else {
				failNum = true;
			}
		}
	});
	return failNum;
}

app.get('/', (req, res) => {
	renderView(req, res);
});

app.get('/user/js/main.js', (req, res) => {
	res.end();
});

app.post('/user/entry', (req, res) => {
	req.checkBody('userNumEntry', 'Please include 6 entries, the last being your lucky ball').notEmpty();
	req.checkBody('userDateEntry', 'Please include the date of your drawing').notEmpty();
	let errors = req.validationErrors(),
		dupObj = {};
	if (errors) {
		renderView(req, res, errors);
	} else if (newEntryScrubber(req.body.userNumEntry, dupObj)) {
		failNum = false;
		errors = [
			{
				msg: `Please enter 6 numbers separated by commas. Entry 6 is the lucky ball.`
			},
			{
				msg: `The first 5 numbers range from 1 to 42 and allow no duplicates.`
			},
			{
				msg: `The lucky ball can range from 1 to 18 and can be a duplicate of the other numbers.`
			}
		];
		renderView(req, res, errors);
	} else {
		let newUserEntry = {
			numArr: req.body.userNumEntry,
			date: req.body.userDateEntry,
			isUser: true
		};
		db.entries.insert(newUserEntry, (err, result) => {
			if (err) {
				console.log(err);
			}
			res.redirect('/');
		});
	}
});

app.post('/win/entry', (req, res) => {
	req.checkBody('winNumEntry', 'Please include 6 entries, the last being your lucky ball').notEmpty();
	req.checkBody('winDateEntry', 'Please include the date of your drawing').notEmpty();
	let errors = req.validationErrors(),
		dupObj = {};
	if (errors) {
		renderView(req, res, errors);
	} else if (newEntryScrubber(req.body.winNumEntry, dupObj, req.body.winDateEntry)) {
		failNum = false;
		errors = [
			{
				msg: `Please enter 6 numbers separated by commas. Entry 6 is the lucky ball.`
			},
			{
				msg: `The first 5 numbers range from 1 to 42 and allow no duplicates.`
			},
			{
				msg: `The lucky ball can range from 1 to 18 and can be a duplicate of the other numbers.`
			},
			{
				msg: `Only one date per winning entry.`
			}
		];
		renderView(req, res, errors);
	} else {
		let newUserEntry = {
			numArr: req.body.winNumEntry,
			date: req.body.winDateEntry,
			isUser: false
		};
		db.entries.insert(newUserEntry, (err, result) => {
			if (err) {
				console.log(err);
			}
			res.redirect('/');
		});
	}
});

app.delete('/user/entry/delete/:id', (req, res) => {
	db.entries.remove({
		_id: ObjectId(req.params.id, (err, result) => {
			if (err) {
				console.log(err);
			}
			res.redirect('/');
		})
	});
});

app.post('*', (req, res) => {
	res.redirect('/');
	res.end();
});

app.get('*', (req, res) => {
	res.redirect('/');
	res.end();
});

app.listen(3000, () => {
	console.log('Server started on port 3000');
});