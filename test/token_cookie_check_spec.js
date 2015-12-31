var _ = require('lodash');
var chai = require('chai');
var sinon = require('sinon');
var httpMocks = require('node-mocks-http');
var murmur = require('murmur');
var Promise = require('bluebird');
var expect = chai.expect;

chai.should();

describe('Token Cookie Check', function() {
  var TokenCookieCheck;
  var tokenModel;
  var request;
  var response;
  var next;
  var stubs = [];

  beforeEach(function() {
    TokenCookieCheck = require('../middleware/token_cookie_check');
    tokenModel = require('../models/token_model');
    request = httpMocks.createRequest();
    response = httpMocks.createResponse();
    next = sinon.spy();

    stubs.push(sinon.stub(tokenModel, 'fetchByCookieOrFingerprint').returns(
      new Promise(function(resolve) { 
        resolve([{ fingerprint: '123', cookie: 'abc', token: 'xyz' }]);
      })
    ));

    stubs.push(sinon.stub(tokenModel, 'updateFingerprint').returns(
      new Promise(function(resolve) { 
        resolve({ fingerprint: '123', cookie: 'abc', token: 'xyz' });
      })
    ));

    stubs.push(sinon.stub(tokenModel, 'updateCookie').returns(
      new Promise(function(resolve) { 
        resolve({ fingerprint: '123', cookie: 'abc', token: 'xyz' });
      })
    ));

    stubs.push(sinon.stub(tokenModel, 'create').returns(
      new Promise(function(resolve) { 
        resolve({ fingerprint: '123', cookie: 'abc', token: 'xyz' });
      })
    ));
  });

  afterEach(function() {
    next.reset();
    stubs.map(function(stub) { stub.restore() });
  });

  it('attempt to fetch by cookie or fingerprint', function() {
    return TokenCookieCheck(request, response, next).then(function() {
      expect(tokenModel.fetchByCookieOrFingerprint.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
    });
  });

  describe('without matching fingerprint or cookie', function() {
    it('should create a brand new token', function() {
      tokenModel.fetchByCookieOrFingerprint.restore();
      stubs.push(sinon.stub(tokenModel, 'fetchByCookieOrFingerprint').returns(
        new Promise(function(resolve) { resolve([]) })
      ));

      return TokenCookieCheck(request, response, next).then(function() {
        expect(tokenModel.create.calledOnce).to.be.true;
        expect(next.calledOnce).to.be.true;
      });
    });
  });

  describe('without matching fingerprint', function() {
    it('should update the fingerprint', function() {
      return TokenCookieCheck(request, response, next).then(function() {
        expect(tokenModel.updateFingerprint.calledOnce).to.be.true;
        expect(tokenModel.create.notCalled).to.be.true;
        expect(next.calledOnce).to.be.true;
      });
    });
  });

  describe('without matching cookie', function() {
    it('should update the cookie', function() {
      var emptyFingerprint = murmur.hash128([null, null, null, null].join(';')).hex();

      tokenModel.fetchByCookieOrFingerprint.restore();
      stubs.push(sinon.stub(tokenModel, 'fetchByCookieOrFingerprint').returns(
        new Promise(function(resolve) { 
          resolve([{ fingerprint: emptyFingerprint, cookie: 'abc', token: 'xyz' }]);
        })
      ));

      return TokenCookieCheck(request, response, next).then(function() {
        expect(tokenModel.updateCookie.calledOnce).to.be.true;
        expect(tokenModel.updateFingerprint.notCalled).to.be.true;
        expect(next.calledOnce).to.be.true;
      });
    });
  });

  describe('with matching fingerprint and cookie', function() {
    it('should simply pass the token through the request object without calling tokenModel', function() {
      var emptyFingerprint = murmur.hash128([null, null, null, null].join(';')).hex();
      request.cookies.rememberme = 'abc';
      
      tokenModel.fetchByCookieOrFingerprint.restore();
      stubs.push(sinon.stub(tokenModel, 'fetchByCookieOrFingerprint').returns(
        new Promise(function(resolve) { 
          resolve([{ fingerprint: emptyFingerprint, cookie: request.cookies.rememberme, token: 'xyz' }]);
        })
      ));

      return TokenCookieCheck(request, response, next).then(function() {
        expect(tokenModel.updateCookie.notCalled).to.be.true;
        expect(tokenModel.updateFingerprint.notCalled).to.be.true;
        expect(tokenModel.create.notCalled).to.be.true;
        expect(next.calledOnce).to.be.true;
        expect(request.token).to.equal('xyz');
      });
    });
  });
});
