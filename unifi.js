
"use strict";

const unifi = require('node-unifi');

class UnifiApi {
	constructor(logger, host, port, user, pass) {
		this.host = host;
		this.port = port;
		this.user = user;
		this.pass = pass;
		this.logger = logger;

		this.init(host, port);
	}
	init(host, port) {
		this.logger.debug('Create API object with url https://%s:%d', host, port);
		this.ctrl = new unifi.Controller(host, port);
	}
	login(user, pass) {
		return this._wrap("login", user, pass);
	}
	adopt(mac, site) {
		return this._wrap("adoptDevice", site, mac);
	}
	_wrap(fn) {
		this.logger.verbose("Calling api: %s", fn);
		var func = this.ctrl[fn];
		var args = new Array(arguments.length);
		for(var i=0; i<args.length - 1; i++) {
			args[i] = arguments[i+1];
		}

		var defered = Promise.defer();
		var handleResult = (err) => {
			if(err) {
				this.logger.verbose("Error calling %s : %s", fn, err);
				defered.reject(err);
			} else {
				this.logger.verbose("Successfully called %s", fn);
				defered.resolve();
			}
		};
		args[args.length-1] = (err) => {
			if(err && err == 'api.err.LoginRequired') {
				args[args.length-1] = handleResult;
				this.init(this.host, this.port);
				this.logger.verbose("Got %s. Try to login to controller.", err);
				this.ctrl.login(this.user, this.pass, (err) => {
					if(err) {
						this.logger.error("Could not login");
						handleResult(err);
					} else {
						this.logger.verbose("Login successful, calling %s again.", fn);
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


module.exports = (logger, host, port, user, pass) => new UnifiApi(logger, host, port, user, pass);
