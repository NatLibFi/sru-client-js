/**
 *
 * @licstart  The following is the entire license notice for the JavaScript code in this file. 
 *
 * SRU (Search/Retrieval via URL) Javascript client library and command-line interface
 *
 * Copyright (c) 2015 University Of Helsinki (The National Library Of Finland)
 *
 * This file is part of sru-client
 *
 * sru-client is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *  
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *  
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this file.
 *
 **/

/* istanbul ignore next: umd wrapper */
(function (root, factory) {

    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['es6-polyfills/lib/promise', 'es6-polyfills/lib/object', 'jxon', 'jjv', 'jjve', '../resources/config-schema'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('es6-polyfills/lib/promise'), require('es6-polyfills/lib/object'), require('jxon'), require('jjv'), require('jjve'), require('../resources/config-schema'));
    }

}(this, factory));

function factory(Promise, Object, JXON, jjv, jjve, schema)
{

    'use strict';

    return function(config, strict)
    {

	function validateConfig()
	{

	    var env = jjv();
	    var je = jjve();
	    var errors = env.validate(schema, config, {
		useDefault: true
	    });

	    if (errors) {
		throw new Error(JSON.stringify(je(schema, config, errors), undefined, 4));
	    }

	}

	/**
	 * @todo Check that the server supports the requested version and recordSchema
	 */
	function validateServer()
	{
	}

	function generateUrl(operation, parameter_map)
	{

	    var url = config.url + '?';

	    parameter_map = typeof parameter_map !== 'object' ? {} : parameter_map;

	    if (config.hasOwnProperty('version')) {
		parameter_map.version = config.version;
	    }
	    if (config.hasOwnProperty('recordSchema')) {
		parameter_map.recordSchema = config.recordSchema;
	    }

	    parameter_map.operation = operation;

	    Object.keys(parameter_map).forEach(function(key) {
		url += key + '=' + parameter_map[key] + '&';
	    });

	    return url;

	}

	function getHttpRequestFunction()
	{

	    var fn, http_get;

	    if (typeof XMLHttpRequest === 'function') {
		fn = function(url) {
		    return new Promise(function(resolve, reject) {
			
			var xhr = new XMLHttpRequest();
			
			xhr.addEventListener('load', function() {
			    resolve(JXON.build(xhr.response));
			});
			xhr.addEventListener('error', function() {
			    reject(new Error('Failed: ' + xhr.statusText));
			});
			xhr.send();
			
		    });		    
		};
	    } else if (typeof require === 'function') {
		try {

		    http_get = require('http').get;
		    fn = function(url) {
			return new Promise(function(resolve, reject) {
			    http_get(
				url,
				function(response) {

				    var xml_str = '';

				    response.on('data', function(chunk) {
					xml_str += chunk;
				    });

				    response.on('end', function() {
					resolve(JXON.stringToJs(xml_str));
				    });

				    response.on('error', function(error) {
					reject(new Error(error.message));
				    });

				}, 
				function(error) {
				    reject(new Error(error.message));
				}
			    );
			});
		    };
		    
		} catch (excp) {
		}
	    }

	    if (!fn) {
		throw new Error('No available HTTP request interface. Supported interfaces: XMLHttpRequest, http.get (Node.js)');
	    } else {
		return fn;
	    }

	}
	var http_request_fn = getHttpRequestFunction();
	
	validateConfig();
	validateServer();
	
	return {
	    searchRetrieve: function(query, start_record_or_options)
	    {
		
		var parameters = {
		    query: query
		};

		if (typeof start_record_or_options === 'number') {
		    parameters.startRecord = start_record_or_options;
		} else if (typeof start_record_or_options === 'object') {
		    Object.assign(parameters, start_record_or_options);
		}

		if (!parameters.hasOwnProperty('maximumRecords')) {
		    parameters.maximumRecords = config.maximumRecords;
		}
		
		return http_request_fn(generateUrl('searchRetrieve', parameters)).then(function(data) {
	
		    if (!data.hasOwnProperty('zs:searchretrieveresponse')) {
			throw new Error('Malformed response: ' + JSON.stringify(data, undefined, 4));
		    }

		    var results = {
			numberOfRecords: data['zs:searchretrieveresponse']['zs:numberofrecords'],
			records: []
		    };

		    if (data['zs:searchretrieveresponse'].hasOwnProperty('zs:nextrecordposition')) {
			results.nextRecordPosition = data['zs:searchretrieveresponse']['zs:nextrecordposition'];
		    }

		    data['zs:searchretrieveresponse']['zs:records']['zs:record'].forEach(function(record) {
			results.records.push(JXON.jsToString(record['zs:recorddata'].record));
		    });

		    return results;

		});

	    },
	    explain: function()
	    {
		return http_request_fn(generateUrl('explain')).then(function(data) {

		    var results = {
			supportedSchemas: {},
			queryIndices: {}
		    };

		    if (!data.hasOwnProperty('zs:explainresponse')) {
			throw new Error('Malformed response: ' + JSON.stringify(data, undefined, 4));
		    }
		    
		    data['zs:explainresponse']['zs:record']['zs:recorddata'].explain.schemainfo.schema.forEach(function(schema_description) {

			results.supportedSchemas[schema_description['@name']] = {
			    title: schema_description.title,
			    sort: schema_description['@sort'],
			};

		    });

		    data['zs:explainresponse']['zs:record']['zs:recorddata'].explain.indexinfo.set.forEach(function(set_description) {
			results.queryIndices[set_description['@name']] = {};
		    });

		    data['zs:explainresponse']['zs:record']['zs:recorddata'].explain.indexinfo.index.forEach(function(index_description) {

			if (Array.isArray(index_description.map)) {
			    index_description.map.forEach(function(name_description) {
				results.queryIndices[name_description.name['@set']][name_description.name.keyValue] = {
				    title: index_description.title,
				    id: index_description['@id']
				};
				
			    });
	 		} else {
	 		    results.queryIndices[index_description.map.name['@set']][index_description.map.name.keyValue] = {
				title: index_description.title,
				id: index_description['@id']
			    };
			}

		    });

		    return results;

		});
	    }
	};

    };

}