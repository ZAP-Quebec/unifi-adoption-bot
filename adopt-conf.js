
"use strict";

const fs = require('fs');
const path = require('path');
const apRegex = /^([a-fA-F0-9:]+)( (.*))?/;


class AdoptConf {
	constructor(folder) {
		this.folder = folder;
	}
	findAp(mac) {
		mac = mac.toLowerCase();
		return this.listSites().then((sites) => {
			if(!sites || sites.length === 0) {
				return [];
			}

			return Promise.all(sites.map((site) => this.findApInSite(mac, site)));
		}).then((res) => res.reduce((arr, el) => arr.concat(el), []));
	}
	listSites() {
		var defered = Promise.defer();
		fs.readdir(this.folder, (err, files) => {
			if(err) {
				return defered.reject(err);
			}
			defered.resolve(files.filter((file) => file.indexOf('.') === -1));
		});
		return defered.promise;
	}
	findApInSite(mac, site) {
		var defered = Promise.defer();
		fs.readFile(path.join(this.folder, site), {encoding: 'utf8'}, (err, data) => {
			if(err) {
				return defered.reject(err);
			}

			var APs = data.split('\n')
				.map((line) => apRegex.exec(line))
				.filter((res) => res && res[1].toLowerCase() == mac)
				.map((res) => {
					return {
						mac: mac,
						site: site,
						alias: res[3],
					};
				});
			defered.resolve(APs);
		});
		return defered.promise;
	}
}

module.exports = (folder) => new AdoptConf(folder);
