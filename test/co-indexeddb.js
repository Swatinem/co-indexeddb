/* vim: set shiftwidth=2 tabstop=2 noexpandtab textwidth=80 wrap : */
/* global indexedDB: true, IDBDatabase: true, IDBTransaction: true */
"use strict";

// co depends on this:
window.setImmediate = function (fn) {
	setTimeout(fn, 0);
};

var co = require('visionmedia-co');
var idb = require('co-indexeddb');
var should = require('chaijs-chai').should();

function cit(name, fn) {
	it(name, function (done) {
		co(fn)(done);
	});
}

describe('co-indexeddb', function () {
	var db;
	afterEach(function (done) {
		if (db)
			db.close();
		var req = indexedDB.deleteDatabase('test');
		req.onsuccess = function () { done(); };
		req.onerror = function () { done(); };
	});
	cit('should open a db connection', function *() {
		db = yield idb('test');
		db.should.be.an.instanceof(IDBDatabase);
	});
	cit('should call the provided upgrade function', function *() {
		var called = 0;
		function inc() {
			called++;
		}
		db = yield idb('test', inc);
		called.should.eql(1);
		db.close();
		db = yield idb('test', inc);
		called.should.eql(1);
		db.close();
		db = yield idb('test', 2, inc);
		called.should.eql(2);
	});
	cit('should create an object store on upgrade', function *() {
		db = yield idb('test', function (db) {
			var os = db.createObjectStore('store');
			os.createIndex('name', 'key');
		});
		db.objectStoreNames[0].should.eql('store');
	});
	cit('should allow getting an object store', function *() {
		db = yield idb('test', function (db) {
			var os = db.createObjectStore('store');
			os.createIndex('name', 'key');
		});
		var tr = db.transaction('store', 'readwrite');
		tr.should.be.an.instanceof(IDBTransaction);
	});
	cit('should allow putting and getting values to/from an object store', function *() {
		db = yield idb('test', function (db) {
			db.createObjectStore('store');
		});
		var tr = db.transaction('store', 'readwrite');
		var os = tr.objectStore('store');
		yield os.put({value: 'value'}, 'key');
		var val = yield os.get('key');
		val.should.eql({value: 'value'});
	});
	cit('should allow deleting values from an object store', function *() {
		db = yield idb('test', function (db) {
			db.createObjectStore('store');
		});
		var tr = db.transaction('store', 'readwrite');
		var os = tr.objectStore('store');
		yield os.put({value: 'value'}, 'key');
		var val = yield os.get('key');
		val.should.eql({value: 'value'});
		yield os.delete('key');
		val = yield os.get('key');
		should.not.exist(val);
	});
	cit('should allow clearing the object store', function *() {
		db = yield idb('test', function (db) {
			db.createObjectStore('store');
		});
		var tr = db.transaction('store', 'readwrite');
		var os = tr.objectStore('store');
		yield os.put({value: 'value'}, 'key');
		var val = yield os.get('key');
		val.should.eql({value: 'value'});
		yield os.clear();
		val = yield os.get('key');
		should.not.exist(val);
	});
	cit('should allow adding objects with keyPath', function *() {
		db = yield idb('test', function (db) {
			db.createObjectStore('store', {keyPath: 'key'});
		});
		var tr = db.transaction('store', 'readwrite');
		var os = tr.objectStore('store');
		yield os.add({key: 'key', value: 'value'});
		var val = yield os.get('key');
		val.should.eql({key: 'key', value: 'value'});
	});
	cit('should provide a transaction.commit() that waits for oncomplete', function *() {
		db = yield idb('test', function (db) {
			db.createObjectStore('store');
		});
		var tr = db.transaction('store', 'readwrite');
		var os = tr.objectStore('store');
		yield os.put({value: 'value'}, 'key');
		yield tr.commit();
		// so when a transaction is committed, we can’t even read from it no more
		var err;
		try {
			yield os.get('key');
		} catch (e) { err = e; }
		err.should.exist;
	});
	cit('should be able to abort a transaction', function *() {
		db = yield idb('test', function (db) {
			db.createObjectStore('store');
		});
		var tr = db.transaction('store', 'readwrite');
		var os = tr.objectStore('store');
		yield os.put({value: 'value'}, 'key');
		tr.abort();
		tr = db.transaction('store', 'readwrite');
		os = tr.objectStore('store');
		var val = yield os.get('key');
		should.not.exist(val);
	});
	cit('should allow iterating a cursor', function *() {
		db = yield idb('test', function (db) {
			db.createObjectStore('store');
		});
		var tr = db.transaction('store', 'readwrite');
		var os = tr.objectStore('store');
		yield os.put({value: 'value1'}, 'key1');
		yield os.put({value: 'value2'}, 'key2');
		var read = os.cursor();
		(yield read()).should.eql(['key1', {value: 'value1'}]);
		(yield read()).should.eql(['key2', {value: 'value2'}]);
		should.not.exist(yield read());
	});
	cit('should allow index operations', function *() {
		db = yield idb('test', function (db) {
			var os = db.createObjectStore('store');
			os.createIndex('value', 'value');
		});
		var tr = db.transaction('store', 'readwrite');
		var os = tr.objectStore('store');
		yield os.put({value: 'value1'}, 'key1');
		yield os.put({value: 'value2'}, 'key2');
		var idx = os.index('value');
		var val = yield idx.get('value1');
		val.should.eql({value: 'value1'});
		var key = yield idx.getKey('value1');
		key.should.eql('key1');
		var count = yield idx.count();
		count.should.eql(2);
		count = yield idx.count('value1');
		count.should.eql(1);
	});
	cit('should allow iteration on indeces', function *() {
		db = yield idb('test', function (db) {
			var os = db.createObjectStore('store');
			os.createIndex('value', 'value');
		});
		var tr = db.transaction('store', 'readwrite');
		var os = tr.objectStore('store');
		yield os.put({value: 'value1'}, 'key1');
		yield os.put({value: 'value2'}, 'key2');
		var idx = os.index('value');
		var read = idx.cursor();
		// the keys are the index values here
		(yield read()).should.eql(['value1', {value: 'value1'}]);
		(yield read()).should.eql(['value2', {value: 'value2'}]);
		should.not.exist(yield read());
	});
});

