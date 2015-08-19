var AWS = require('aws-sdk'),
  attr = require('dynamodb-data-types').AttributeValue,
  fs = require('fs');

module.exports = {
  migrate: function(callback) {
    var migrationLocation = process.env.PWD + "/dynamo-migrations";
    fs.readdir(migrationLocation, function(err, files) {
      if (err) {
        console.error("Unable to get content from dynamo-migrations folder. Reason: ", err);
      }

      var dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(process.env.AWS_DYNAMODB_ENDPOINT) });
      checkAndCreateMigrationTable(dynamodb, function(err) {
        if (err) {
          throw err;
        }

        executeMigrations(dynamodb, files, callback);
      });
    });
  }
}

var executeMigrations = function(dynamodb, files, callback) {
  var filename = files[0];
  var fileLocation =  process.env.PWD + "/dynamo-migrations/" + filename;
  var migration = require(fileLocation);
  if (typeof migration.migrate === 'function') {
    var executeNext = function(dynamodb, files, callback) {

      if (files.length == 1) {
        if (typeof callback === 'function') {
          callback();
        }
      } else {
        var filtered = files.slice(1, files.length);
        executeMigrations(dynamodb, filtered, callback);
      }
    }

    checkIfMigrationAlreadyRan(dynamodb, filename, function(err) {
      if (err) {
        throw err;
      }

      console.log('running migration: ', fileLocation);
      migration.migrate(dynamodb, function(err) {
        if (err) {
          throw err;
        }

        saveMigrationInformation(dynamodb, filename, function(err) {
          executeNext(dynamodb, files, callback);
        });
      });
    }, function() {
      executeNext(dynamodb, files, callback);
    });
  } else {
    console.error("'migrate' function not found.", fileLocation);
    throw new Error("'migrate' function not found in: ", fileLocation);
  }
}

var checkIfMigrationAlreadyRan = function(dynamodb, filename, callback, skipCallback) {
  var params = {
    TableName: process.env.DYNAMO_MIGRATIONS_TABLENAME,
    IndexName: 'name_index',
    KeyConditions: {
      'name': {
        AttributeValueList: [{'S': filename}],
        ComparisonOperator: 'EQ'
      }
    }
  };

  dynamodb.query(params, function(err, data) {
    if (err) {
      callback(err);
    }

    if (data.Items.length > 0) {
      skipCallback();
    } else {
      callback(null, null);
    }
  });
}

var saveMigrationInformation = function(dynamodb, filename, callback) {
  dynamodb.describeTable({TableName:process.env.DYNAMO_MIGRATIONS_TABLENAME}, function(err, data) {
    dynamodb.putItem({
      Item: attr.wrap({
        id: data.Table.ItemCount + 1,
        name: filename,
        status: 'success',
        createdat: new Date().toISOString()
      }),
      TableName: process.env.DYNAMO_MIGRATIONS_TABLENAME
    }, function(err, data) {
      callback(err);
    });
  });
}

var checkAndCreateMigrationTable = function(dynamodb, callback) {
  dynamodb.describeTable({TableName: process.env.DYNAMO_MIGRATIONS_TABLENAME}, function(err, data) {
    if (err != null && err.code == 'ResourceNotFoundException') {
      var migTable = {
        AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'N' },
            { AttributeName: 'name', AttributeType: 'S' }
          ],
          GlobalSecondaryIndexes: [
            {IndexName: 'name_index',
             KeySchema: [{AttributeName: 'name', KeyType: 'HASH'}],
             Projection: {ProjectionType: 'ALL'},
             ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1}}
          ],
          KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }
          ],
          ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
          TableName: process.env.DYNAMO_MIGRATIONS_TABLENAME
      };

      console.log('creating migration table.')

      dynamodb.createTable(migTable, function(error, data) {
        if (error) {
          console.log("Migration table creation error: ", error);
          throw new Error("failed to create migrations table");
        }
        callback();
      });
    } else {
      callback();
    }
  });
}
