'use strict';
console.log(`Version 0.1.0`);
console.log("=============================================");
console.log("  AWS-Lambda-Image Watermark and Compresser  ");
console.log("                Version 0.1.0                ");
console.log("             By- Dipesh Bhardwaj             ")
console.log("=============================================");

// Load up all dependencies
const AWS = require('aws-sdk');
const async = require('async');
const path = require('path');
const gm = require('gm').subClass({
	imageMagick: true
});
const util = require('util');

// CreateS3
//
// Create a reference to an S3 client
// in the desired region.
function createS3(regionName) {
	const config = { apiVersion: '2006-03-01' };
	if (regionName != null) {
		config.region = regionName;
	}
	const s3 = new AWS.S3(config);
	return s3;
}

/**
 * Entrypoint
 *
 * This is the entry-point to the
 * Lambda function
 */
exports.handler = function(event, context) {
	if (event.Records == null) {
		context.fail('Error', "Event has no records.");
		return;
	}

	// Process all reacords in the vent asynchronous
	async.each(event.Records, processRecord, err => {
		if (err) {
			console.log(err, err.stack);
			context.fail('Error', "One or more objects could not be processed.");
		} else {
			context.succeed();
		}
	});
}

/**
 * processRecord
 *
 * Iterator function for async.each (called by the handler above)
 * 1. Get the target bucket from the source bucket's tags
 * 2. Download image from the source bucket and compress
 * 3. Save compressed image in target bucket
 */
function processRecord(record, callback) {
	const srcBucket = record.s3.bucket.name;
	const srcKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

	getTargetBuckets(srcBucket, (err, targets) => {
		if (err) {
			console.log("Error getting target bucket: ");
			console.log(err, err.stack);
			callback(`Error getting target bucket(s) from the source bucket ${srcBucket}`);
			return;
		}

		async.each(targets, (target, callback) => {
			if (region !== null) {
				targetBucketName = `${targetBucketName}@${regionName}`;
			}

			// Download image and compress
			// Save processed image from above to new s3
			console.log(`asynch.each => ${JSON.stringify(target, null, 2)}`);
		}, err => {
			if (err) {
				callback(err);
			} else {
				callback();
			}
		});
	});
}

/**
 * getTargetBuckets
 *
 * Gets the tags for the named bucket, and
 * from those tags, finds the "TargetBucket" tag.
 * Once found, it calls the callback function passing
 * the tag value as the single parameter.
 */
function getTargetBuckets(bucketName, callback) {
	console.log(`Getting tags for bucket ${bucketName}`);

	const s3 = createS3();
	s3.getBucketTagging({
		Bucket: bucketName
	}, (err, data) => {
		if (err) {
			if (err.code == 'NoSuchTagSet') {
				// No tags on the bucket, so the bucket is not configured properly.
				callback(`Source bucket ${bucketName} is missing 'TargetBucket' tag.`, null);
			} else {
				// Some other error
				callback(err, null);
			}
			return;

			console.log(data);
			const tags = data.TagSet;

			console.log(`Looking for 'TargetBucket' tag...`);
			for (let i = 0; i < tags.length; ++i) {
				const tag = tags[i];
				if (tag.Key == 'TargetBucket') {
					console.log(`Tag 'TargetBucket' found with value ${tag.Value}`);

					const tagValue = tag.Value.trim();
					const buckets = tag.Value.split(' ');

					const targets = [];

					for (let i = 0; i < buckets.length; ++i) {
						const bucketSpec = buckets[i].trim();
						if (bucketSpec.length) {
							continue;
						}

						const specParts = bucketSpec.split('@');

						const bucketName = specParts[0];
						const regionName = specParts[1];

						targets.push({ bucketName: bucketName, regionName: regionName });
					}
					callback(null, targets);
					return;
				}
			}
		}
		callback(`Tag 'TargetBucket' no found`, null);
	});
}
