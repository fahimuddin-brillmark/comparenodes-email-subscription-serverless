const dynamoose = require("dynamoose");

const TABLE_NAME = process.env.TABLE_NAME;

const SubscriptionEmailSchema = new dynamoose.Schema(
	{
		email: {
			type: String,
			hashKey: true,
		},
		shouldSendEmail: {
			type: Boolean,
			default: true,
		},
		subscribedAt: {
			type: String,
			default: () => new Date().toString(),
		},
	},
	{
		saveUnknown: true,
	}
);

const SubscriptionEmailModel = dynamoose.model(
	TABLE_NAME,
	SubscriptionEmailSchema
);
module.exports = SubscriptionEmailModel;
