#!/usr/bin/env node

const argv = (function(optimist) {
	var cmd = optimist.usage('Usage: $0 --host hostname --adoptionfolder /etc/unifi-adoption-bot');

	var required = ['host', 'adoptionfolder'];

	if(!process.env['UNIFI_USER']) {
		required.push('user');
	}

	if(!process.env['UNIFI_PASS']) {
		required.push('pass');
	}

	cmd.describe('logfile', 'Path to unifi server\'s log file')
	   .default('logfile', '/var/log/unifi/server.log')
	   .describe('user', 'Unifi\'s username (default to env.UNIFI_USER)')
	   .describe('pass', 'Unifi\'s password (default to env.UNIFI_PASS)')
	   .describe('host', 'Unifi\'s hostname')
	   .describe('port', 'Unifi\'s port')
	   .default('port', 8443)
	   .describe('adoptionfolder', 'Folder containing lists of AP')
	   .demand(required);

	var argv = cmd.argv;

	if(!argv.user && process.env['UNIFI_USER']) {
		argv.user = process.env['UNIFI_USER'];
	}

	if(!argv.pass && process.env['UNIFI_PASS']) {
		argv.pass = process.env['UNIFI_PASS'];
	}

    return argv;
})(require('optimist'));

const unifi = require('./unifi')(argv.host, argv.port);


unifi.login(argv.user, argv.pass).then(function() {
	console.log("Connected to unifi controler");
}, function(err) {
	console.error("Couldn't connect to unifi's controler.", err);
	process.exit(1);
});


const adoptingReg = /\[([^\]]+)\] <([^>]+)>.+AP\[([a-fA-F0-9:]+)\] was discovered and waiting for adoption/;

const conf = require('./adopt-conf.js')(argv.adoptionfolder);

const adoptedAps = {};

const watcher = require('./watcher')(argv.logfile, function(line) {
	var res = adoptingReg.exec(line);

	if(res) {
		var mac = res[3].toLowerCase();

		// ensure we only adopt once for a same log line
		var date = parseDate(res[1]);
		if (adoptedAps[mac] && date <= adoptedAps[mac]) {
			console.log("AP[%s] already adopted on %s", mac, new Date(date));
			return;
		} else {
			adoptedAps[mac] = date;
		}

		conf.findAp(mac).then((aps) => {
			if(aps.length === 0) {
				console.log("AP[%s] waiting for adoption not found in config file", mac);
			} else if(aps.length > 1) {
				console.log("Found AP[%s] in multiple config files (%s)", mac, aps.map((ap) => ap.site).join(', '));
			} else {
				var ap = aps[0];
				console.log("Adopting AP[%s] to %s", mac, ap.site);
				return unifi.adopt(mac, ap.site);
			}
		}).then(() => {
			console.log("Successfuly adopted AP[%s]", mac);
		}, (err) => {
			console.log("Error adopting AP[%s]:", mac, err);
		});
	}
});

function parseDate(str) {
	str = str.replace(' ', 'T').replace(',', '.');

	var offset = new Date(str).getTimezoneOffset() / 60;

	return new Date(str+'-0'+offset+':00').getTime();
}
