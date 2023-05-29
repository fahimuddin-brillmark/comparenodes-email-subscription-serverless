const dynamoose = require("dynamoose");

function DBConfig() {
	const ddb = new dynamoose.aws.ddb.DynamoDB({
		credentials: {
			accessKeyId: process.env.ACCESS_KEY,
			secretAccessKey: process.env.SECRET_ACCESS_KEY,
		},
		region: process.env.REGION_NAME,
	});

	dynamoose.aws.ddb.set(ddb);
}

module.exports = DBConfig;
