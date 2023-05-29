// S3
const {
	PutObjectCommand,
	S3Client,
	GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// S3
const s3Client = new S3Client({
	credentials: {
		accessKeyId: process.env.ACCESS_KEY,
		secretAccessKey: process.env.SECRET_ACCESS_KEY,
	},
	region: process.env.REGION_NAME,
});

// Dynamoose;
const DBConfig = require("./config/database");
DBConfig();

const SubscriptionEmailModel = require("./models/SubscriptionEmailModel");

const BUCKET_NAME = process.env.BUCKET_NAME;

module.exports.handler = async (event) => {
	console.log("Request: ", JSON.stringify(event, undefined, 2));
	console.log("Event: ", event);
	console.log("Method: ", event.requestContext.http.method);

	let body;

	try {
		switch (event.requestContext.http.method) {
			case "GET":
				if (
					event.pathParameters != null &&
					event.pathParameters.format === "csv"
				) {
					body = await getCsvResult(event);
				} else {
					body = await getJsonResult(event);
				}
				break;
			case "POST":
				body = await addSubscribedEmail(event);
				break;
			default:
				throw new Error(
					`Unsupported Route: "${event.requestContext.http.method}"`
				);
		}

		console.log("Body: ", body);

		return {
			statusCode: body.statusCode,
			body: JSON.stringify({
				message: body.message,
				body: body.result,
			}),
		};
	} catch (e) {
		console.error(e);
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: `Failed to Perform Operations: "${event.httpMethod}"`,
				errorMessage: e.message,
				errorStack: e.stack,
			}),
		};
	}
};

const getResults = async () => {
	const results = await SubscriptionEmailModel.scan()
		.attributes(["email", "subscribedAt", "shouldSendEmail"])
		.exec();

	return results;
};

const getJsonResult = async (event) => {
	console.log("Event: ", event);
	const Items = await getResults();

	console.log("getJsonResult: ", Items);

	// return Items;
	return {
		statusCode: 200,
		message: `Successfully Finished Operations: "${event.requestContext.http.method}"`,
		result: Items,
	};
};

const getCsvResult = async (event) => {
	console.log("Event: ", event);
	const Items = await getResults();

	console.log("getCsvResult: ", Items);

	const newLine = "\r\n";
	let fields = ["Email", "Subscribed At", "shouldSendEmail"];
	fields = fields + newLine;

	if (Object.keys(Items).length !== 0) {
		console.log("Object Not Null");

		Items.forEach((row) => {
			fields += `${row["email"]}, ${row["subscribedAt"]}, ${row["shouldSendEmail"]}  ${newLine}`;
		});
	}

	console.log("fields: ", fields);

	const command = new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: "subscription.csv",
		ContentType: "application/octet-stream",
		Body: Buffer.from(fields),
	});

	const s3Result = await s3Client.send(command);

	console.log("s3Result: ", s3Result);

	const getCommand = new GetObjectCommand({
		Bucket: BUCKET_NAME,
		Key: "subscription.csv",
	});

	const getResponse = await s3Client.send(getCommand);
	console.log("getResponse: ", getResponse);

	const str = await getResponse.Body.transformToString();
	console.log("str: ", str);

	const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

	console.log("URL: ", url);

	// return url;
	return {
		statusCode: 200,
		message: `Successfully Finished Operations: "${event.requestContext.http.method}"`,
		result: url,
	};
};

const addSubscribedEmail = async (event) => {
	const { email } = JSON.parse(event.body);
	console.log("Request Email: ", email);

	const existingUser = await SubscriptionEmailModel.get(email);
	console.log("existingUser: ", existingUser);
	if (existingUser?.email) {
		// return `${email} is already exist.`;
		return {
			statusCode: 409,
			message: `Conflict! ${email} is already exist.`,
			result: "",
		};
	}

	const result = await SubscriptionEmailModel.create({ email: email });
	console.log("addSubscribedEmail Result: ", result);

	// return result;
	return {
		statusCode: 200,
		message: `Successfully Finished Operations: "${event.requestContext.http.method}"`,
		result: result,
	};
};
