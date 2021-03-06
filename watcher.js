"use strict";

const fs = require('fs');
const path = require('path');

const StringDecoder = require('string_decoder').StringDecoder;
const Tail = require('tail').Tail;


const skipLength = 1024 * 1024;

class Watcher {
	constructor(file, logger, cb) {
		this.fullpath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
		const dir = path.dirname(this.fullpath);

		this.file = path.basename(this.fullpath);
		this.cb = cb;
		this.logger = logger;
		this.decoder = new StringDecoder('utf8');


		var tail = new Tail(this.fullpath, {
			follow: true,
		});
 
		tail.on("line", cb);
		 
		tail.on("error", function(error) {
		  logger.error('Tail ERROR: %s', error);
		});

		// this._watch = fs.watch(dir, (ev, filename) => this.onEvent(ev, filename));
		// this._pending = null;
		// this._fd = null;
		// this._fLength = 0;
		// this._buf = "";

		// this.open(false);
		// this.skipContent();
	}
	onEvent(ev, filename) {
		if(filename != this.file) {
			return;
		}

		if(ev == 'rename') {
			this.readUntilEnd();
			this.reopen();
		}
		this.checkTruncated();
		this.readUntilEnd();
	}
	open(fromBeginning) {
		this.run(() => {
			var defered = Promise.defer();
			fs.access(this.fullpath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
				//
			});
			return defered.promise;

			this._fLength = 0;
			var defered = Promise.defer();
			fs.open(this.fullpath, 'r', (err, fd) => {
				this._fd = err ? null : fd;
				return defered.resolve();
			});
			return defered.promise;
		});
	}
	close() {
		this.run(() => {
			if(!this._fd) {
				return Promise.accept();
			}

			var defered = Promise.defer();
			fs.close(this._fd, () => {
				this._fd = null;
				return defered.resolve();
			});
			return defered.promise;
		})
	}
	reopen() {
		this.close();
		this.open();
	}
	skipContent() {
		this.run(() => {
			if(!this._fd) {
				return Promise.accept();
			}

			var defered = Promise.defer();
			var buf = new Buffer(skipLength);
			this._read(null, -1, buf, defered, true);
			return defered.promise;
		});
	}
	checkTruncated() {
		this.run(() => {
			if(!this._fd) {
				return Promise.accept();
			}

			var defered = Promise.defer();
			fs.fstat(this._fd, (err, stats) => {
				if(err) {
					console.error("fstat err:", err);
				} else if(stats.size <= this._fLength) {
					this._fLength = 0;
				}
				return defered.resolve();
			})
			return defered.promise;
		});
	}
	readUntilEnd() {
		this.run(() => {
			if(!this._fd) {
				return Promise.accept();
			}

			var defered = Promise.defer();
			var buf = new Buffer(1024);
			this._read(null, -1, buf, defered, false);
			return defered.promise;
		});
	}
	_read(err, bytesRead, buffer, defered, ignoreData) {
		if(err || bytesRead === 0) {
			return defered.resolve();
		}

		if(bytesRead > 0) {
			this._fLength += bytesRead;
		}

		if(!ignoreData && bytesRead !== -1) {
			this.handleData(buffer.slice(0, bytesRead));
		}

		fs.read(this._fd, buffer, 0, buffer.length, this._fLength, (err, bytesRead, buffer) => this._read(err, bytesRead, buffer, defered, ignoreData));
	}
	handleData(buffer) {
		var str = this.decoder.write(buffer);

		var index = str.lastIndexOf('\n');
		if(index === -1) {
			this._buf += str;
			return;
		}

		this._buf += str.slice(0, index);
		var lines = this._buf.split('\n');
		this._buf = str.slice(index + 1);

		for(var i=0; i<lines.length; i++) {
			this.cb(lines[i]);
		}
	}
	run(cb) {
		this._pending = (this._pending || Promise.accept()).then(cb);
	}

}

module.exports = function(file, logger, cb) {
	return new Watcher(file, logger, cb);
}
