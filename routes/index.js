var express = require('express');
var murmur = require('murmur');
var uuid = require('node-uuid');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    token: req.token
  });
});

module.exports = router;
