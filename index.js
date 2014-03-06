/* vim: set shiftwidth=2 tabstop=2 noexpandtab textwidth=80 wrap : */
/* global indexedDB: true */
"use strict";

module.exports = function (name, version, upgrade) {
	if (typeof version === 'function') {
		upgrade = version;
		version = undefined;
	}
	var req = indexedDB.open(name, version || 1);
	req.onupgradeneeded = function () { upgrade && upgrade(req.result); };
	return req2thunk(req, function (db) {
		var transaction = db.transaction;
		db.transaction = function () {
			var tr = transaction.apply(db, arguments);
			// wait for the oncomplete callback, which means the transaction is done
			tr.commit = function () {
				return function (cb) {
					tr.oncomplete = function () {
						cb();
					};
					tr.onerror = function () {
						cb(tr.error);
					};
				};
			};
			var objectStore = tr.objectStore;
			tr.objectStore = function () {
				var os = objectStore.apply(tr, arguments);
				os.add = wrap(os.add, os);
				os.clear = wrap(os.clear, os);
				os.count = wrap(os.count, os);
				os.delete = wrap(os.delete, os);
				os.get = wrap(os.get, os);
				os.put = wrap(os.put, os);

				// lets just call this `cursor`, its much nicer
				os.cursor = makeCursor(os);

				var index = os.index;
				os.index = function () {
					var idx = index.apply(os, arguments);
					idx.count = wrap(idx.count, idx);
					idx.get = wrap(idx.get, idx);
					idx.getKey = wrap(idx.getKey, idx);

					// TODO: I really don’t care about openKeyCursor right now
					idx.cursor = makeCursor(idx);

					return idx;
				};

				return os;
			};
			return tr;
		};
		return db;
	});
};

function makeCursor(obj) {
	return function () {
		var args = arguments;
		var cursor;
		var nextcb;
		// OMG, this is so crazy. why is indexeddb such a broken api?
		return function () {
			return next;
		};
		function next(cb) {
			nextcb = cb;
			if (cursor)
				return cursor.continue();
			obj.openCursor.apply(obj, args).onsuccess = function (ev) {
				cursor = ev.target.result;
				if (!cursor)
					return nextcb(undefined, null);
				nextcb(undefined, [cursor.key, cursor.value]);
			};
		}
	};
}

function wrap(fn, ctx, transform) {
	//ctx = ctx || this;
	return function () {
		return req2thunk(fn.apply(ctx, arguments), transform);
	};
}

function req2thunk(req, transform) {
	return function (cb) {
		req.onsuccess = function () {
			var res = req.result;
			if (transform)
				res = transform(res);
			cb(undefined, res);
		};
		req.onerror = function () {
			cb(req.error);
		};
	};
}
