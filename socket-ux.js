//This module has everything to do with the socket.io stuff with the regular usage

var logger = require('./logger.js'); //for pretty console outputs

var PublicChannel=require('./models/PublicChannel.js');
var Message = require('./models/Message.js');

module.exports=function(io,socket,RedisClient){
  //When a new chat message has been received
  socket.on('message', function(data) {
    if (socket.authorized) { //makes sure that the socket handshake was successfull
      //creating the message
      var newMessage = new Message();
      newMessage.senderUsername = socket.username;
      newMessage.senderName = socket.name;
      newMessage.contents = data.contents;
      newMessage.type = data.type;
      newMessage.dateSent = Date.now();
      newMessage.dateSentInMinutes = Math.ceil(newMessage.dateSent.getTime() / 1000 / 60);
      newMessage.senderProfilePicture = socket.profile_picture;
      //will send to the buffer in this line, before setting the profile picture
      io.sockets.in(data.destination.id).emit('message', newMessage);
      logger.debug('Sending message to ' + data.destination.id);
    }
  });
  socket.on('getPublicChannelsList', function(data) {
    logger.debug('Retrieving list of public channels and sending to client \n',{username: socket.username});
    //get all channels keys stored in redis database
    RedisClient.keys('channel:*',function(err,keys){
      if (err){
        logger.error('There was an error in retrieving the channels list from the redis database');
      }
      else{
        //get all the values of those keys
        RedisClient.mget(keys,function(err,channels){
          if (err){
            logger.error('There was an error in retrieving the channels list from the redis database');
          }
          if(channels){
            socket.emit('publicChannelsList', channels);
          }
        });
      }
    });
  });
  socket.on('joinRoom', function(data) { //TODO Room id and authorization validation
    if (data) {
      socket.join(data.id);
    }
    logger.debug('Socket joined channel \n %j', {
      room: data
    }, {});
  });
  socket.on('subscribeToChannel', function(channel) {
    socket.newPublicChannels.push(channel);
  });

  socket.on('CreatePublicChannel', function(channel) { //TODO: MAKE THE SEARCH FUNCTION A METHOD WITH A CALLBACK

  });
  //checks that database to see whether a name with the channel exists
  socket.on('checkPublicChannelName', function(channelName) {

  });
};