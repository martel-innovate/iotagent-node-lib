/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-iotagent-lib
 *
 * fiware-iotagent-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-iotagent-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-iotagent-lib.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

var iotAgentLib = require('../../'),
    _ = require('underscore'),
    async = require('async'),
    nock = require('nock'),
    utils = require('../tools/utils'),
    groupRegistryMemory = require('../../lib/services/groupRegistryMemory'),
    request = require('request'),
    should = require('should'),
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        server: {
            name: 'testAgent',
            port: 4041,
            baseRoot: '/'
        },
        types: {},
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    optionsCreation = {
        url: 'http://localhost:4041/iot/agents/testAgent/services',
        method: 'POST',
        json: {
            services: [
                {
                    resource: '/deviceTest',
                    apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                    type: 'SensorMachine',
                    trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
                    cbHost: 'http://unexistentHost:1026',
                    commands: [
                        {
                            name: 'wheel1',
                            type: 'Wheel'
                        }
                    ],
                    lazy: [
                        {
                            name: 'luminescence',
                            type: 'Lumens'
                        }
                    ],
                    active: [
                        {
                            name: 'status',
                            type: 'Boolean'
                        }
                    ]
                }
            ]
        },
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    },
    optionsDelete = {
        url: 'http://localhost:4041/iot/agents/testAgent/services',
        method: 'DELETE',
        json: {},
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        },
        qs: {
            resource: '/deviceTest',
            apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
        }
    },
    optionsUpdate = {
        url: 'http://localhost:4041/iot/agents/testAgent/services',
        method: 'PUT',
        json: {
            trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
            cbHost: 'http://anotherUnexistentHost:1026',
            commands: [
                {
                    name: 'wheel1',
                    type: 'Wheel'
                }
            ],
            lazy: [
                {
                    name: 'luminescence',
                    type: 'Lumens'
                }
            ],
            active: [
                {
                    name: 'status',
                    type: 'Boolean'
                }
            ]
        },
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        },
        qs: {
            resource: '/deviceTest',
            apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
        }
    },
    optionsList = {
        url: 'http://localhost:4041/iot/agents/testAgent/services',
        method: 'GET',
        json: {},
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/*'
        }
    },
    optionsGet = {
        url: 'http://localhost:4041/iot/agents/testAgent/services',
        method: 'GET',
        json: {},
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    };

describe('Device Group Configuration API', function() {

    beforeEach(function(done) {
        iotAgentLib.activate(iotAgentConfig, function() {
            groupRegistryMemory.clear(done);
        });
    });

    afterEach(function(done) {
        iotAgentLib.setConfigurationHandler();

        iotAgentLib.deactivate(function() {
            groupRegistryMemory.clear(done);
        });
    });
    describe('When a new device group creation request arrives', function() {
        it('should return a 200 OK', function(done) {
            request(optionsCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should store it in the DB', function(done) {
            request(optionsCreation, function(error, response, body) {
                request(optionsList, function(error, response, body) {
                    body.count.should.equal(1);
                    body.services[0].apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                    done();
                });
            });
        });
        it('should store the service information from the headers into the DB', function(done) {
            request(optionsCreation, function(error, response, body) {
                request(optionsList, function(error, response, body) {
                    body.count.should.equal(1);
                    body.services[0].service.should.equal('TestService');
                    body.services[0].subservice.should.equal('/testingPath');
                    done();
                });
            });
        });
        it('should call the configuration creation handler', function(done) {
            var handlerCalled = false;

            iotAgentLib.setConfigurationHandler(function(newConfiguration, callback) {
                should.exist(newConfiguration);
                should.exist(callback);
                newConfiguration.apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                newConfiguration.trust.should.equal('8970A9078A803H3BL98PINEQRW8342HBAMS');
                handlerCalled = true;
                callback();
            });

            request(optionsCreation, function(error, response, body) {
                handlerCalled.should.equal(true);
                done();
            });
        });
    });
    describe('When a new creation request arrives for a pair (resource, apiKey) already existant', function() {
        it('should return a 400 DUPLICATE_GROUP error', function(done) {
            request(optionsCreation, function(error, response, body) {
                request(optionsCreation, function(error, response, body) {
                    should.not.exist(error);
                    response.statusCode.should.equal(400);
                    body.name.should.equal('DUPLICATE_GROUP');
                    done();
                });
            });
        });
    });
    describe('When a creation request arrives without the fiware-service header', function() {
        beforeEach(function() {
            delete optionsCreation.headers['fiware-service'];
        });

        afterEach(function() {
            optionsCreation.headers['fiware-service'] = 'TestService';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });
    describe('When a creation request arrives without the fiware-servicepath header', function() {
        beforeEach(function() {
            delete optionsCreation.headers['fiware-servicepath'];
        });

        afterEach(function() {
            optionsCreation.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });
    describe('When a device group with a missing mandatory attribute in the payload arrives', function() {
        beforeEach(function() {
            delete optionsCreation.json.services[0].resource;
        });

        afterEach(function() {
            optionsCreation.json.services[0].resource = '/deviceTest';
        });

        it('should fail with a 400 WRONG_SYNTAX error', function(done) {
            request(optionsCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('WRONG_SYNTAX');
                done();
            });
        });
    });
    describe('When a device group removal request arrives', function() {
        beforeEach(function(done) {
            request(optionsCreation, done);
        });

        it('should return a 200 OK', function(done) {
            request(optionsDelete, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should remove it from the database', function(done) {
            request(optionsDelete, function(error, response, body) {
                request(optionsList, function(error, response, body) {
                    body.count.should.equal(0);
                    done();
                });
            });
        });
        it('should remove it from the configuration', function(done) {
            request(optionsDelete, function(error, response, body) {
                /* jshint sub:true */

                should.not.exist(iotAgentConfig.types['SensorMachine']);
                done();
            });
        });
    });

    describe('When a device group removal arrives to a DB with three groups', function() {
        beforeEach(function(done) {
            var optionsCreation1 = _.clone(optionsCreation),
                optionsCreation2 = _.clone(optionsCreation),
                optionsCreation3 = _.clone(optionsCreation);

            optionsCreation1.json = { services: [] };
            optionsCreation3.json = { services: [] };

            optionsCreation1.json.services[0] = _.clone(optionsCreation.json.services[0]);
            optionsCreation3.json.services[0] = _.clone(optionsCreation.json.services[0]);

            optionsCreation1.json.services[0].apikey = 'qwertyuiop';
            optionsCreation3.json.services[0].apikey = 'lkjhgfds';

            async.series([
                async.apply(request, optionsCreation1),
                async.apply(request, optionsCreation2),
                async.apply(request, optionsCreation3)
            ], done);
        });

        it('should remove just the selected group', function(done) {
            request(optionsDelete, function(error, response, body) {
                request(optionsList, function(error, response, body) {
                    body.count.should.equal(2);

                    for (var i = 0; i < body.services.length; i++) {
                        body.services[i].apikey.should.not.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                    }

                    done();
                });
            });
        });
    });

    describe('When a device group removal request arrives without the mandatory headers', function() {
        beforeEach(function() {
            delete optionsDelete.headers['fiware-servicepath'];
        });

        afterEach(function() {
            optionsDelete.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsDelete, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group removal request arrives without the mandatory parameters', function() {
        beforeEach(function() {
            delete optionsDelete.qs;
        });

        afterEach(function() {
            optionsDelete.qs =  {
                resource: '/deviceTest',
                apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
            };
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsDelete, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group update request arrives', function() {
        beforeEach(function(done) {
            var optionsCreation1 = _.clone(optionsCreation),
                optionsCreation2 = _.clone(optionsCreation),
                optionsCreation3 = _.clone(optionsCreation);


            optionsCreation1.json = { services: [] };
            optionsCreation3.json = { services: [] };

            optionsCreation1.json.services[0] = _.clone(optionsCreation.json.services[0]);
            optionsCreation3.json.services[0] = _.clone(optionsCreation.json.services[0]);

            optionsCreation1.json.services[0].apikey = 'qwertyuiop';
            optionsCreation3.json.services[0].apikey = 'lkjhgfds';

            async.series([
                async.apply(request, optionsCreation1),
                async.apply(request, optionsCreation2),
                async.apply(request, optionsCreation3)
            ], done);
        });

        it('should return a 200 OK', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });

        it('should update the appropriate values in the database', function(done) {
            request(optionsUpdate, function(error, response, body) {
                request(optionsList, function(error, response, body) {
                    var found = false;
                    body.count.should.equal(3);

                    for (var i = 0; i < body.services.length; i++) {
                        if (body.services[i].apikey === '801230BJKL23Y9090DSFL123HJK09H324HV8732' &&
                            body.services[i].resource === '/deviceTest') {
                            body.services[i].cbHost.should.equal('http://anotherUnexistentHost:1026');
                            found = true;
                        }
                    }

                    found.should.equal(true);
                    done();
                });
            });
        });
        it('should call the configuration creation handler', function(done) {
            var handlerCalled = false;

            iotAgentLib.setConfigurationHandler(function(newConfiguration, callback) {
                should.exist(newConfiguration);
                should.exist(callback);
                newConfiguration.cbHost.should.equal('http://anotherUnexistentHost:1026');
                newConfiguration.trust.should.equal('8970A9078A803H3BL98PINEQRW8342HBAMS');
                handlerCalled = true;
                callback();
            });

            request(optionsUpdate, function(error, response, body) {
                handlerCalled.should.equal(true);
                done();
            });
        });
    });

    describe('When a device group update request arrives without the mandatory headers', function() {
        beforeEach(function() {
            delete optionsUpdate.headers['fiware-servicepath'];
        });

        afterEach(function() {
            optionsUpdate.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group update request arrives without the mandatory parameters', function() {
        beforeEach(function() {
            delete optionsUpdate.qs.resource;
        });

        afterEach(function() {
            optionsUpdate.qs.resource = '/deviceTest';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group listing request arrives', function() {
        beforeEach(function(done) {
            var optionsCreation1 = _.clone(optionsCreation),
                optionsCreation2 = _.clone(optionsCreation),
                optionsCreation3 = _.clone(optionsCreation);


            optionsCreation2.json = { services: [] };
            optionsCreation3.json = { services: [] };

            optionsCreation2.json.services[0] = _.clone(optionsCreation.json.services[0]);
            optionsCreation3.json.services[0] = _.clone(optionsCreation.json.services[0]);

            optionsCreation2.json.services[0].apikey = 'qwertyuiop';
            optionsCreation3.json.services[0].apikey = 'lkjhgfds';

            async.series([
                async.apply(request, optionsCreation1),
                async.apply(request, optionsCreation2),
                async.apply(request, optionsCreation3)
            ], done);
        });

        it('should return a 200 OK', function(done) {
            request(optionsList, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should return all the configured device groups from the database', function(done) {
            request(optionsList, function(error, response, body) {
                body.count.should.equal(3);
                done();
            });
        });
    });

    describe('When a device info request arrives', function() {
        beforeEach(function(done) {
            async.series([
                async.apply(request, optionsCreation)
            ], done);
        });

        it('should return a 200 OK', function(done) {
            request(optionsGet, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should return all the configured device groups from the database', function(done) {
            request(optionsGet, function(error, response, body) {
                body.service.should.equal('TestService');
                done();
            });
        });
    });
    describe('When a new device from a created group arrives to the IoT Agent and sends a measure', function() {
        var contextBrokerMock,
            values = [
                {
                    name: 'status',
                    type: 'String',
                    value: 'STARTING'
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://unexistentHost:1026')
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/contextRequests/updateContext3.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/contextResponses/updateContext1Success.json'));

            async.series([
                async.apply(request, optionsCreation)
            ], done);
        });

        afterEach(function(done) {
            nock.cleanAll();
            done();
        });

        it('should use the configured data', function(done) {
            iotAgentLib.update('machine1', '/deviceTest', '801230BJKL23Y9090DSFL123HJK09H324HV8732', values,
                function(error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
        });
    });
});
