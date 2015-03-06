//=======Initializing Required Modules=======
var express = require('express');
var app = express();
var http = require('http').Server(app);
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var io = require('socket.io')(http);
var randomstring = require("randomstring"); //used for session secret key
var RedisStore = require('connect-redis')(session);
var redis = require("redis");
var RedisClient = redis.createClient();
var multer  = require('multer');

//Initializing custom objects
var MongoDBConfig = require('./config/mongo.js'); //contains MongoDB database settings
var RedisDBConfig = require('./config/redis.js'); //contains Redis database settings
var ChatRoom = require('./models/ChatRoom.js');
var User = require('./models/User.js');
var Message = require('./models/Message.js');
var route = require('./routes/main.js'); //routes will go through this

//======Configuration of the Server=======

mongoose.connect(MongoDBConfig.url); //have mongoose connect to the MongoDB database
require('./config/passport')(passport); // pass passport for configuration

//setting up the redis client
RedisClient.select(RedisDBConfig.databaseNumber, function() {
  console.log("Redis Client is using database #"+RedisDBConfig.databaseNumber+" and a port number of "+RedisDBConfig.portNumber);
});

//setting the port number for the server to use
var PORTNUMBER = 3000;
app.set('port', process.env.PORT || PORTNUMBER);

//settings the views directory for the templating engine
app.set('views', __dirname + '/views');

//setting ejs as the templating engine
app.set('view engine', 'ejs');

//tells the server to serve html files through ejs
app.engine('html', require('ejs').renderFile);

//======Configuration of Middleware===========

//Setting the public folder to server static content(images, javacsript, stylesheets)
app.use(express.static(__dirname + "/public"));

app.use(cookieParser()); //enable the user of cookies
app.use(bodyParser()); //get info from html forms
app.use(multer({ dest: './tmp/'}));
app.use(session({
  store: new RedisStore({
    host: RedisDBConfig.host,
    port: RedisDBConfig.portNumber,
    db: RedisDBConfig.databaseNumber
      // pass: 'RedisPASS'
  }),
  secret: randomstring.generate(128),
  cookie: {
    maxAge: 2678400000 // 31 days
  }
}));

app.use(passport.initialize()); //initializing passport
app.use(passport.session()); // for persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

//=======Routes======
require('./routes/main.js')(app, passport);

//Creating the chatroom object
var chat = new ChatRoom();
chat.authorized_users = ['serge'];
var onlineUsers = 0;
// //executes when a user connects

io.on('connection', function(socket) {
  console.log("a connection has been made");
  onlineUsers++;
  console.log('Online Users: ' + onlineUsers);
  socket.on('session', function(data) {
    //checking for whether the sessionID is found in the database before letting the user connect
    RedisClient.get("sess:"+data, function(err, reply) {
      if(err){
        return console.err(err);
      }
      if (reply) {
        User.findOne({'_id':JSON.parse(reply).passport.user},function(err,result){
          if(err)
            console.err(err);

          socket.name=result.name;
          socket.username=result.username;
          socket.authorized = true;
          socket.emit("credentials",{name:result.name, username:result.username}); //sends the user his name and username
        });

      } else {
        //disconnects the user if session handshake failed
        socket.emit('disconnect',"Sorry, you've been disconnected because of authorization reasons");
        socket.disconnect();
        socket.authorized = false;
      }
    });
  });

  //When a new chat message has been received
  socket.on('message', function(data) {
    if (socket.authorized) {
      var newMessage=new Message();
      newMessage.senderUsername=socket.username;
      newMessage.senderName=socket.name;
      newMessage.contents=data.contents;
      newMessage.type=data.type;
      newMessage.dateSent=Date.now();
      newMessage.dateSentInMinutes=Math.ceil(newMessage.dateSent.getTime()/1000/60);
      io.emit('message', newMessage);
    }
  });

  //executes when a user disconnects
  socket.on('disconnect', function() {
    onlineUsers--;
    console.log('Online Users: ' + onlineUsers);
  });
});

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('404', {
    message: err.message,
    error: {}
  });
});

http.listen(3000, function() {
  console.log('ChatPi Server Started. Listening on Port: ' + PORTNUMBER);
});
