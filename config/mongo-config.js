//This file contains the mongoDB database configuration and connection settings
var logger=require('../logger.js');
var mongoose = require('mongoose'); //for interacting with the mongo database

//Edit this line for custom mongoDB server options
var MongoDBConfig={
  url:'127.0.0.1',
  port:27017,
  databaseName: "ChatPi",
  databaseUsername: "",
  databasePassword: ""
};

//will configure and connect to the mongodb database
module.exports=function(callback){
  if(MongoDBConfig.databaseUsername==='' || MongoDBConfig.databaseUsername===null){
    mongoose.connect("mongodb://"+MongoDBConfig.url+":"+MongoDBConfig.port+"/"+MongoDBConfig.databaseName);
  }
  else{
    mongoose.connect("mongodb://"+MongoDBConfig.databaseUsername+":"+MongoDBConfig.databasePassword+"@"+MongoDBConfig.url+":"+MongoDBConfig.port+"/"+MongoDBConfig.databaseName);
  }


  //when mongoose connects to the database
  mongoose.connection.on('connected', function() {
    logger.info("Successfully connected to the mongoDB database");
    //callback();
  });
  //if mongoose is disconnected from the database
  mongoose.connection.on('disconnected', function() {
    logger.warn("The connection at the mongodb database at "+MongoDBConfig.url+" has been disconnected");
  });
  //if mongoose fails to connect to the database
  mongoose.connection.on('error', function(err) {
    logger.error("An error occurred connecting to the mongoDB database.\n"+err);
  });
  // If the Node process ends, close the Mongoose connection
  process.on('SIGINT', function() {
    mongoose.connection.close(function () {
      logger.warn('MongoDB database has been disconnected through app termination');
      process.exit(0);
    });
  });
};
