'use strict';

const app = require('express')();
const expect = require('chai').expect;
require('chai').should();
const _ = require('lodash');
const io = require('socket.io-client');
const SocketioBot = require('../../lib').botTypes.SocketioBot;
const config = require('../config.js');

describe.only('socketio Bot tests', function() {
  const settings = {
    id: config.socketIoBotInfo.id,
  };

  /*
  * Before all tests, create an instance of the bot which is
  * accessible in the following tests.
  * And also set up the mountpoint to make the calls.
  * Also start a server listening on port 3000 locally
  * then close connection
  */
  let bot= null;
  let server = null;

  before(function(done){
    server = app.listen(3000, function() {  });
    settings.server = server;
    bot = new SocketioBot(settings);
    done();
  });

  describe('#constructor()', function() {
    it('should throw an error when server is missing', function(done) {
      const badSettings = _.cloneDeep(settings);
      expect(() => new SocketioBot(badSettings)).to.throw(
        'ERROR: bots of type \'socketio\' must be defined with \'server\' in their settings');
      done();
    });

    it('should throw an error when id is missing', function(done) {
      const badSettings = _.cloneDeep(settings);
      badSettings.id = undefined;
      expect(() => new SocketioBot(badSettings)).to.throw(
        'ERROR: bots of type \'socketio\' are expected to have \'id\' in their settings');
      done();
    });
  });

  describe('receiving messages', function() {

    it('a client sending a text message should go through', function(done) {
      const socket = io("ws://localhost:3000");

      bot.once('update', function() {
        expect(bot.type).to.equal('socketio');
        done();
      });

      socket.on('conected', function() {
        socket.send(JSON.stringify({text: 'Party & Bullshit'}));
      });
    });

    it('a client sending a text message should work', function(done) {
      const socket = io("ws://localhost:3000");

      bot.once('update', function() {
        expect(bot.type).to.equal('socketio');
        done();
      });

      socket.on('conected', function() {
        socket.send(JSON.stringify({text: 'Party & Bullshit'}));
      });
    });

    it('a client sending an attachment should work', function(done) {
      const socket = io('ws://localhost:3000');

      bot.once('update', function() {
        expect(bot.type).to.equal('socketio');
        done();
      });

      const attachments = [
        {
          type: 'image',
          payload: {
            url: 'https://raw.githubusercontent.com/ttezel/twit/master/tests/img/bigbird.jpg'
          }
        }
      ];

      socket.on('conected', function() {
        socket.send(JSON.stringify({attachments: attachments}));
      });
    });

    it('developer can route message to other user if wanted without duplication', function(done) {
      const socketOne = io('ws://localhost:3000');
      const socketTwo = io('ws://localhost:3000');
      let connectedClientCount = 0;

      bot.once('update', function(bot, update) {
        bot.sendTextMessageTo(update.message.text, socketTwo.id);
      });

      socketTwo.on('message', function(msg) {
        // timeout to make sure we don't enter socketOne.on('message')
        expect(msg).to.equal("Party & Bullshit");
        setTimeout(function() {
          done();
        }, 150);
      });

      socketOne.on('message', function() {
        // this should never be reached
        expect(1 === 2);
      });

      const trySendMessage = function trySendMessage() {
        ++connectedClientCount;
        if (connectedClientCount === 2) {
          socketOne.send({text: "Party & Bullshit"});
        }
      };

      socketOne.on('connected', trySendMessage);
      socketTwo.on('connected', trySendMessage);

    });
  });

  describe('socketio #__formatUpdate(rawUpdate)', function() {

    it('should emit an error event to the bot object when ' +
       'update is badly formatted', function(done) {

      bot.once('error', function(err) {
        err.message.should.equal(`Error in __formatUpdate "Expected \'text\' and/or \'attachments\' but got \'Party & Bullshit\' instead"`);
        done();
      });

      bot.__formatUpdate('Party & Bullshit');
    });

    it('should format a text message update in the expected way', function() {
      const rawUpdate = {
        text: "Party & Bullshit",
      };

      const socketId = 'madeUpId';

      const update = bot.__formatUpdate(rawUpdate, socketId);

      expect(update.raw).to.equal(rawUpdate);
      expect(update.sender.id).to.equal(socketId);
      expect(update.message.text).to.equal("Party & Bullshit");
      expect(update.message.attachments).to.equal(undefined);
      expect(update.timestamp).to.not.equal(undefined);
      expect(update.message.mid).to.not.equal(undefined);
      expect(update.message.seq).to.equal(null);
    });

    it('should format an attachment message in the expected way', function() {
      const rawUpdate =  {
        attachments: [
          {
            type: 'image',
            payload: {
              url: 'https://raw.githubusercontent.com/ttezel/twit/master/tests/img/bigbird.jpg'
            }
          }
        ]
      };

      const socketId = 'madeUpId';

      const update = bot.__formatUpdate(rawUpdate, socketId);

      expect(update.raw).to.equal(rawUpdate);
      expect(update.sender.id).to.equal(socketId);
      expect(update.message.text).to.equal(undefined);
      expect(update.message.attachments).to.equal(rawUpdate.attachments);
      expect(update.timestamp).to.not.equal(undefined);
      expect(update.message.mid).to.not.equal(undefined);
      expect(update.message.seq).to.equal(null);
    });

    it('should format a text and attachment in the expected way', function() {
      const rawUpdate =  {
        text: "Party & Bullshit",
        attachments: [
          {
            type: 'image',
            payload: {
              url: 'https://raw.githubusercontent.com/ttezel/twit/master/tests/img/bigbird.jpg'
            }
          }
        ]
      };

      const socketId = 'madeUpId';

      const update = bot.__formatUpdate(rawUpdate, socketId);

      expect(update.raw).to.equal(rawUpdate);
      expect(update.sender.id).to.equal(socketId);
      expect(update.message.text).to.equal(rawUpdate.text);
      expect(update.message.attachments).to.equal(rawUpdate.attachments);
      expect(update.timestamp).to.not.equal(undefined);
      expect(update.message.mid).to.not.equal(undefined);
      expect(update.message.seq).to.equal(null);
    });

  // end of describe(formatUpdate)
  });

  after(function(done) {
    server.close(() => done());
  });

});
