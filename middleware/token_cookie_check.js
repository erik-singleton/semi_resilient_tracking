var uaParser = require('ua-parser-js');
var murmur = require('murmur');
var uuid = require('node-uuid');

var tokenModel = require('../models/token_model');

module.exports = function tokenCookieCheck(req, res, next) {
  var hashedFingerprint = hashUaAndIp(req.headers['user-agent'], req.headers['x-real-ip']);
  var oldCookie = req.cookies.rememberme || '';
  var newCookie = uuid.v4();
  var newToken = uuid.v4();

  tokenModel.fetchByCookieOrFingerprint({ cookie: oldCookie, fingerprint: hashedFingerprint }).then(function(result) {
    var result = result[0];

    if (!result) {
      tokenModel
        .create({ fingerprint: hashedFingerprint, cookie: newCookie, token: newToken })
        .then(function(result) {
          req.token = newToken;
          res.cookie('rememberme', newCookie);
          next();
        });
    }
    else if (result.fingerprint !== hashedFingerprint) {
      tokenModel.updateFingerprint(result.id, hashedFingerprint).then(function(updatedResult) {
        req.token = updatedResult.changes[0].token;
        next();
      });
    }
    else if (result.cookie !== oldCookie) {
      tokenModel.updateCookie(result.id, newCookie).then(function(result) {
        req.token = result.changes[0].new_val.token;
        res.cookie('rememberme', newCookie);
        next();
      });
    }
    else {
      req.token = result.token;
      next();
    }
  });
}

function hashUaAndIp(rawUserAgent, ip) {
  var userAgent = uaParser(rawUserAgent);
  var fingerprint = [
    userAgent.device.model,
    userAgent.device.vendor,
    userAgent.device.type,
    ip
  ].join(';');

  return murmur.hash128(fingerprint).hex();
}

