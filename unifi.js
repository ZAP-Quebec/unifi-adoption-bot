
"use strict";

var unifi = require('node-unifi');

class UnifiApi {
	constructor(host, port) {
		this.host = host;
		this.port = port;

		this.ctrl = new unifi.Controller(host, port);
	}
	login(user, pass) {
		return this._wrap("login", user, pass);
	}
	adopt(mac, site) {
		return this._wrap("adoptDevice", site, mac);
	}
	_wrap(fn) {
		var func = this.ctrl[fn];
		var args = new Array(arguments.length);
		for(var i=0; i<args.length - 1; i++) {
			args[i] = arguments[i+1];
		}

		var defered = Promise.defer();
		args[args.length-1] = function(err) {
			if(err) {
				defered.reject(err);
			} else {
				defered.resolve();
			}
		};
		func.apply(this.ctrl, args);
		return defered.promise;
	}
}


module.exports = (host, port) => new UnifiApi(host, port);
