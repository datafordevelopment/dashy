var router = require('express').Router(),
  _ = require('underscore'),
  Application = require('../models/application'),
  Request = require('../models/request');

module.exports = function(io) {

  router.get('/:app_key', function(req, res){
     Request.find({appKey:req.params.app_key}).sort({date: 1}).exec(function (err, requestsDb) {
      if (err) {
        res.send(500, err);
        return;
      }
      res.send(200, requestsDb);
    });
  });

  router.post('/:app_key', function(req, res) {
    var appKey = req.params.app_key;
    var data = req.body.request;
    if(!data) {
      res.send(400, {error: 'Empty data.'});
      return;
    }
    
    if(data.name === undefined || data.success === undefined) {
      res.send(400, {error: 'Invalid data. name and success fields are required.'})
      return;
    }

    Application.findOne({key: appKey}, function (err, app) {      
      if(!app || err) {
        res.send(400, {error:'Invalid application key. Please make sure the given key is correct.'});
        return;
      }
      
      var requestModel = { 
        appKey: app.key,
        name: data.name,
        success: data.success,
        date: new Date(),
        meta: data.meta
      };
      
      new Request(requestModel).save(function(err, requestDb){
        io && io.sockets.emit('newRequest', requestDb);

        res.send(200);
      });

    });
  });

  return router;
}