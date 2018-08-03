import fetch from 'node-fetch';
import {DOMParser, XMLSerializer} from 'xmldom';

const DEFAULT_VERSION = '1.0';
const MAXIMUM_RECORDS = '1000';
const RECORD_SCHEMA = 'marcxml';

export default function ({serverUrl, version, maximumRecords, recordSchema}) {
	version = version || DEFAULT_VERSION;
	maximumRecords = maximumRecords || MAXIMUM_RECORDS;
	recordSchema = recordSchema || RECORD_SCHEMA;

	return {
		searchRetrieve
	};

	async function searchRetrieve(query) {
		return pump();

		async function pump(startRecord = 1, results = []) {
			let lastRecordPosition;

			const url = `${serverUrl}?operation=searchRetrieve&version=${version}&maximumRecords=${maximumRecords}&recordSchema=${recordSchema}&startRecord=${startRecord}&query=${query}`;
			const response = await fetch(url);
			const serializer = new XMLSerializer();
			const doc = new DOMParser().parseFromString(await response.text());

			const numberOfRecords = Number(doc.getElementsByTagName('zs:numberOfRecords').item(0).textContent);
			const records = doc.getElementsByTagName('zs:record');

			for (let i = 0; i < records.length; i++) {
				const record = records.item(i);

				for (let k = 0; k < record.childNodes.length; k++) {
					const childNode = record.childNodes.item(k);

					if (childNode.localName === 'recordData') {
						results.push(serializer.serializeToString(childNode));
					} else if (childNode.localName === 'recordPosition' && i === records.length - 1) {
						lastRecordPosition = Number(childNode.textContent);
					}
				}
			}

			if (lastRecordPosition < numberOfRecords) {
				return pump(lastRecordPosition + 1, results);
			}

			return results;
		}
	}
}
