var request = require('supertest')
  , app = require('../../../server')
  , expect = require('chai').expect
  , Application = require('../../../lib/models/application')
  , Request = require('../../../lib/models/request')
  ;


describe('Requets API', function() {

  describe('GET /api/requests/:app_key', function(){
    describe('when get resource', function() {
      var appKey;      
      
      //preparing database
      before(function(done) {
        Application.remove({}, function(err) {
          if(err) console.error(err);
          new Application({ name: 'The app' }).save(function (err, app) {
            appKey = app.key;

            Request.remove({}, function(err){
              new Request({appKey: appKey, success:true, name:'Service', environment: 'Production'}).save();
              new Request({appKey: appKey, success:false, name:'Service', environment: 'Production'}).save();
              new Request({appKey: appKey, success:true, name:'Service', environment: 'QA'}).save();
              new Request({appKey: 'AnotherAppKey' , success:false, name:'Service', environment: 'Test'}).save();
              for (var i=0; i<10; i++){
                // This is for testing the limit on some queries
                new Request({appKey: appKey, success:true, name:'Service', environment: 'Production'}).save();
              }
              done();
            });
          });
        });
      });

      it('should return an array requests with no more than 10 requests', function(done){
        request(app)
        .get('/api/requests/'+appKey)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);

          var requests = JSON.parse(res.text);

          expect(requests.length).to.lessThan(11);
          done();
        });
      });
    });
  });

  describe('POST /api/requests/:app_key', function () {

    describe('when request with empty data', function () {
      it('should send an empty data message', function (done) {
        request(app)
        .post('/api/requests/empty_data')
        .expect('Content-Type', /json/)
        .expect(400)
        .end(function end(err, res){
          if (err) return done(err);

          var data = JSON.parse(res.text);
          expect(data).to.deep.equal({error:'Empty data.'});
          done();
        });
      });
    });

    describe('when request with invalid data', function () {
      it('should send an invalid data message', function (done) {
        request(app)
        .post('/api/requests/invalid_data')
        .expect('Content-Type', /json/)
        .send({request:{}})
        .expect(400)
        .end(function end(err, res){
          if (err) return done(err);

          var data = JSON.parse(res.text);
          expect(data).to.deep.equal({error:'Invalid data. name and success fields are required.'});
          done();
        });
      });
    });

    describe('when request with invalid key', function () {
      it('should send a invalid key message', function (done) {
        var data = {
          request: {name: 'Service', success: true }
        };
        request(app)
        .post('/api/requests/invalid_key')
        .send(data)
        .expect('Content-Type', /json/)
        .expect(400)
        .end(function end(err, res){
          if (err) return done(err);
          var data = JSON.parse(res.text);
          expect(data).to.deep.equal({error:'Invalid application key. Please make sure the given key is correct.'});
          done();
        });
      });
    });

    describe('when request with a valid key', function () {
      var appKey;      
    
      before(function(done){
        new Application({ name: 'The app' }).save(function (err, app) {
          appKey = app.key;
          done();
        });
      });

      it('should add requests for the application if the app_key exists', function (done) {
        request(app)
        .post('/api/requests/'+appKey)
        .send({
          request: {
            name: 'Service', 
            success: true,
            meta: {
              environment: 'Production',
              metattr: 'metaValue'
            }
          }
        })
        .expect(200)
        .end(function end(err, res){
          if (err) return done(err);
          
          Application.findOne({ key: appKey }, function (err, app) {
            expect(app.key).to.be.equal(appKey);
            Request.find({appKey: app.key}, function(err, requests) {
              
              expect(requests.length).to.be.equal(1);
              expect(requests[0].date).to.be.a('date');
              expect(requests[0].success).to.be.equal(true);
              expect(requests[0].name).to.be.equal('Service');
              expect(requests[0].meta.environment).to.be.equal('Production');
              expect(requests[0].meta.metattr).to.be.equal('metaValue');

              done();
            });
          });
        });
      });
    });
  });
});
