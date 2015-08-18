var expect = require('chai').expect,
    dynmigrate = require('../index'),
    fs = require('fs'),
    AWS = require('aws-sdk');

require('dotenv').load();


var oldPath = process.env.PWD + "/temp_migrations";
var newPath = process.env.PWD + "/dynamo-migrations";
var dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(process.env.AWS_DYNAMODB_ENDPOINT) });

var copyMigrations = function(numberOfFilesToMove) {
  var fileNames = fs.readdirSync(oldPath);
  if (numberOfFilesToMove != -1) {
    fileNames = fileNames.slice(0, numberOfFilesToMove);
  }

  fileNames.forEach(function(fileName) {
    fs.createReadStream(oldPath + "/" + fileName).pipe(fs.createWriteStream(newPath + "/" + fileName));
  });
}

var clearMigrations = function() {
  var fileNames = fs.readdirSync(newPath);
  fileNames.forEach(function(fileName) {
    fs.unlinkSync(newPath + "/" + fileName);
  });
}

var deleteTables = function(tableNames, done) {
  tableNames.forEach(function(tableName) {
    dynamodb.deleteTable({TableName: tableName}, function(err, data) {});
  });

  waitForDeletion(tableNames, done);
}

var waitForDeletion = function(tableNames, done) {
  dynamodb.listTables(function(err, data) {
    var filteredTableNames = data.TableNames.filter(function(tableName) {
      return (tableNames.indexOf(tableName) != -1);
    });
    if (filteredTableNames.length == 0) {
      console.log("cleared all tables.");
      done();
    }

    filteredTableNames.forEach(function(tableName) {
      if (tableNames.indexOf(tableName) != -1) {
        setTimeout(function () {
          deleteTables(tableNames, done);
        }, 1000);
      }
    });
  });
}

describe('#migrate', function() {
  beforeEach(function(done) {
    this.timeout(4000);
    clearMigrations();
    copyMigrations(1);
    deleteTables(['dynamo_migrations', 'table1', 'table2'], done);
  });

  it('should run migrations for all file in location ./dynamo-migrations', function(done) {
    dynmigrate.migrate();
    done();
  });

  it('should create migrations table if not created', function(done) {
    dynmigrate.migrate(function() {
      dynamodb.describeTable({TableName: 'dynamo_migrations'}, function(err, data) {
        expect(err).to.be.null;
        done();
      });
    });
  });

  it('should run only new migrations', function(done) {
    copyMigrations(2); // move only one file.
    dynmigrate.migrate(function() {
      dynamodb.describeTable({TableName: 'table1'}, function(err, data) {
        expect(err).to.be.null;
        dynamodb.describeTable({TableName: 'table2'}, function(err, data) {
          expect(err.code).to.be.equal('ResourceNotFoundException');

          var ALL = -1;
          copyMigrations(ALL); // all new migrations.
          dynmigrate.migrate(function() {
            dynamodb.describeTable({TableName: 'table2'}, function(err, data) {
              expect(err).to.be.null;
              done();
            });
          });
        });
      });
    });
  });
});
