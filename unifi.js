
"use strict";

var unifi = require('node-unifi');

class UnifiApi {
	constructor(host, port, user, pass) {
		this.host = host;
		this.port = port;
		this.user = user;
		this pass = pass;

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
		function handleResult(err) {
			if(err) {
				defered.reject(err);
			} else {
				defered.resolve();
			}
		}
		args[args.length-1] = (err) => {
			if(err && err == 'api.err.LoginRequired') {
				// try once to login again
				console.log("Got first `%s`, try login.", err);
				args[args.length-1] = handleResult;
				this.ctrl = new unifi.Controller(this.host, this.port);
				this.ctrl.login(this.user, this.pass, (err) => {
					if(err) {
						handleResult(err);
					} else {
						func.apply(this.ctrl, args);
					}
				});
			} else {
				handleResult(err);
			}
		};
		func.apply(this.ctrl, args);
		return defered.promise;
	}
}


module.exports = (host, port) => new UnifiApi(host, port);
