var async = require('async');
var r = require('rethinkdb');
var config = {
  host: process.env.AUGUR_HOST || 'localhost',
  port: process.env.AUGUR_PORT || 28015,
  db: process.env.AUGUR_DB || 'augur'
};

var connection = null;
var AUGUR_TABLE_NAME = 'token_to_id';

module.exports.setup = function(cb) {
  async.waterfall([
    function connect(callback) {
      r.connect({ db: config.db, host: config.host, port: config.port }, callback);
    },
    function createDatabase(connection, callback) {
      r.dbList().contains(config.db).do(function(containsDb) {
        return r.branch(
          containsDb,
          { created: 0 },
          r.dbCreate(config.db)
        );
      }).run(connection, function(err) {
        callback(err, connection);
      });
    },
    function createTable(connection, callback) {
      r.tableList().contains(AUGUR_TABLE_NAME).do(function(containsTable) {
        return r.branch(
          containsTable,
          { created: 0 },
          r.tableCreate(AUGUR_TABLE_NAME)
        );
      }).run(connection, function(err) {
        callback(err, connection);
      });
    },
    function createIndex(connection, callback) {
      r.table(AUGUR_TABLE_NAME).indexList().contains('fingerprint').do(function(hasIndex) {
        return r.branch(
          hasIndex,
          { created: 0 },
          r.table(AUGUR_TABLE_NAME).indexCreate('fingerprint')
        );
      }).run(connection, function(err) {
        callback(err, connection);
      });
    },
    function waitForIndex(connection, callback) {
      r.table(AUGUR_TABLE_NAME).indexWait('fingerprint').run(connection, function(err, result) {
        callback(err, connection);
      });
    }
  ], function(err, connection) {
    cb(connection);
  });
};

module.exports.fetchByCookieOrFingerprint = function(obj) {
  var cookie = obj.cookie;
  var fingerprint = obj.fingerprint;

  return r.table(AUGUR_TABLE_NAME).filter(function(doc) {
      return r.expr(doc('fingerprint').eq(fingerprint)).or(doc('cookie').eq(cookie));
    }).run(global._rdbConn).then(function(cursor) {
      return cursor.toArray();
    });
};

module.exports.updateFingerprint = function(id, fingerprint) {
  return r.table(AUGUR_TABLE_NAME)
    .get(id)
    .update({ fingerprint: fingerprint }, { returnChanges: true })
    .run(global._rdbConn);
};

module.exports.fetchByFingerprint = function(fingerprint) {
  return r.table(AUGUR_TABLE_NAME)
    .getAll(fingerprint, { index: 'fingerprint' })
    .run(global._rdbConn)
    .then(function(cursor) {
      return cursor.toArray();
    });
};

module.exports.updateCookie = function(id, newCookie) {
  return r.table(AUGUR_TABLE_NAME).get(id).update({ cookie: newCookie }, { returnChanges: true }).run(global._rdbConn);
};

module.exports.create = function(obj) {
  return r.table(AUGUR_TABLE_NAME).insert(obj).run(global._rdbConn);
};
