#!/usr/bin/env node

const argv = (function(yargs) {
	var cmd = yargs.usage('Usage: $0 --host hostname --adoptionfolder /etc/unifi-adoption-bot')
		.options({
			'logfile': {
				alias: 'f',
				demandOption: true,
				normalize: true,
				default: '/var/log/unifi/server.log',
				describe: 'Path to unifi server\'s log file',
				type: 'string'
			},
			'user': {
				alias: 'u',
				describe: 'Unifi\'s username (default to env.UNIFI_USER)',
				type: 'string'
			},
			'pass': {
				describe: 'Unifi\'s password (default to env.UNIFI_PASS)',
				type: 'string'
			},
			'host': {
				alias: 'h',
				demandOption: true,
				describe: 'Unifi\'s hostname',
				type: 'string'
			},
			'port': {
				alias: 'p',
				demandOption: true,
				default: 8443,
				describe: 'Unifi\'s port',
				type: 'number'
			},
			'adoptionfolder': {
				alias: 'd',
				normalize: true,
				demandOption: true,
				describe: 'Folder containing lists of AP',
				type: 'string'
			},
			'verbosity': {
				alias: 'v',
				default: 'info',
				describe: 'Log level',
				type: 'string',
				choices: ['error', 'warn', 'info', 'verbose', 'debug'],
			},
    	});

	if(!process.env['UNIFI_USER']) {
		cmd.require('user');
	}

	if(!process.env['UNIFI_PASS']) {
		cmd.require('pass');
	}

	var argv = cmd.argv;

	if(!argv.user && process.env['UNIFI_USER']) {
		argv.user = process.env['UNIFI_USER'];
	}

	if(!argv.pass && process.env['UNIFI_PASS']) {
		argv.pass = process.env['UNIFI_PASS'];
	} else {
		console.warn("Use caution when passing password with the command line's arguments");
	}

    return argv;
})(require('yargs'));

const winston = require('winston');
const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ level: argv.verbosity }),
    ]
});

const unifi = require('./unifi')(logger, argv.host, argv.port, argv.user, argv.pass);


unifi.login(argv.user, argv.pass).then(function() {
	logger.info("Successfully connected to unifi controler");
}, function(err) {
	logger.error("Couldn't connect to unifi's controler.", err);
	process.exit(1);
});


const adoptingReg = /\[([^\]]+)\] <([^>]+)>.+AP\[([a-fA-F0-9:]+)\] was discovered and waiting for adoption/;

const conf = require('./adopt-conf.js')(argv.adoptionfolder);

const adoptedAps = {};
const STATUS_ADOPTED = {adopted: true};

const watcher = require('./watcher')(argv.logfile, logger, function(line) {
	var res = adoptingReg.exec(line);

	if(res) {
		var mac = res[3].toLowerCase();

		// ensure we only adopt once for a same log line
		var date = parseDate(res[1]);
		if (adoptedAps[mac] && date <= adoptedAps[mac]) {
			logger.warn("Possibly reading an old log line. AP[%s] already adopted on %s", mac, new Date(date));
			return;
		}

		adoptedAps[mac] = date;
		logger.verbose("Searching config files for AP[%s]", mac);

		conf.findAp(mac).then((aps) => {
			if(aps.length === 0) {
				logger.info("AP[%s] waiting for adoption not found in config file", mac);
			} else if(aps.length > 1) {
				logger.warn("Found AP[%s] in multiple config files (%s)", mac, aps.map((ap) => ap.site).join(', '));
			} else {
				var ap = aps[0];
				logger.info("Adopting AP[%s] to %s", mac, ap.site);
				return unifi.adopt(mac, ap.site).then(() => STATUS_ADOPTED);
			}
			return {adopted: false};
		}).then((result) => {
			if(result.adopted) {
				logger.info("Successfuly adopted AP[%s]", mac);
			}
		}, (err) => {
			logger.error("Error adopting AP[%s]:", mac, err);
		});
	}
});

function parseDate(str) {
	str = str.replace(' ', 'T').replace(',', '.');

	var offset = new Date(str).getTimezoneOffset() / 60;

	return new Date(str+'-0'+offset+':00').getTime();
}
