/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
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
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Federico M. Facca - Martel Innovate
 */

'use strict';

var request = require('request'),
    errors = require('../../errors'),
    intoTrans = require('../common/domain').intoTrans,
    logger = require('logops'),
    config = require('../../commonConfig'),
    async = require('async'),
    apply = async.apply,
    context = {
        op: 'IoTAgentNGSI.NGSIService'
    };


/**
 * Generate a new subscription request handler, based on the device and triggers given to the function.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {Object} triggers     Array with the names of the attributes that would trigger the subscription.
 * @param {Boolean} store       If set, store the subscription result in the device. Otherwise, return the ID.
 * @param {Function} callback   Callback to be called when the subscription handler ends.
 * @return {Function}           Returns a request handler for the given data.
 */
function createSubscriptionHandler(device, triggers, store, callback) {
    return function(error, response, body) {
        if (error || !body) {
            logger.debug(
                context,
                'Transport error found subscribing device with id [%s] to entity [%s]', device.id, device.name);

            callback(error);

        } else if (response.statusCode !== 200 && response.statusCode !== 201) {
            logger.debug(context, 'Unknown error subscribing device with id [%s] to entity [%s]: $s',
                response.statusCode);

            callback(new errors.EntityGenericError(device.name, device.type, {
                details: body
            }, response.statusCode));

        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion found subscribing device with id [%s] to entity [%s]: %s',
                device.id, device.name, body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else if (store) {
            if (!device.subscriptions) {
                device.subscriptions = [];
            }

            device.subscriptions.push({
                id: body.subscribeResponse.subscriptionId,
                triggers: triggers
            });

            config.getRegistry().update(device, callback);
        } else {
            callback(null, body.subscribeResponse.subscriptionId);
        }
    };
}

/**
 * Makes a subscription for the given device's entity, triggered by the given attributes. The contents of the
 * notification can be selected using the "content" array (that can be left blank to notify the complete entity).
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {Object} triggers     Array with the names of the attributes that would trigger the subscription
 * @param {Object} content      Array with the names of the attributes to retrieve in the notification.
 */
function subscribe(device, triggers, content, callback) {
    var options = {
        method: 'POST',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.subservice
        },
        json: {
                entities: [
                    {
                        type: device.type,
                        isPattern: 'false',
                        id: device.name
                    }
                ],
                reference: config.getConfig().providerUrl + '/notify',
                duration: config.getConfig().deviceRegistrationDuration || 'P100Y',
                notifyConditions: [
                    {
                        type: 'ONCHANGE',
                        condValues: triggers
                    }
                ],
                throttling: config.getConfig().throttling
            }
        },
        store = true;

    if (content) {
        options.json.attributes = content;
        store = false;
    }

    if (device.cbHost) {
        options.uri = 'http://' + device.cbHost + '/v1/subscribeContext';
    } else {
        options.uri = 'http://' + config.getConfig().contextBroker.host + ':' +
            config.getConfig().contextBroker.port + '/v1/subscribeContext';
    }

    var conf = config.getConfig();

    if (config.getConfig().authentication && config.getConfig().authentication.enabled) {
        config.getGroupRegistry().find(device.service, device.subservice, function(error, deviceGroup) {
          var typeInformation;
          if (deviceGroup) {
              typeInformation = deviceGroup;
          } else if (config.getConfig().types && config.getConfig().types[device.resource]){
              typeInformation = config.getConfig().types[device.resource];
          } else if (config.getConfig().types && config.getConfig().types[device.type]){
              typeInformation = config.getConfig().types[device.type];
          } else {
              typeInformation = device;
          }
          
          var security = config.getSecurityService();
          if (typeInformation && typeInformation.trust) {
              async.waterfall([
                  apply(security.auth, typeInformation.trust),
                  apply(security.getToken, typeInformation.trust),
                  apply(addSecurityToken, options),
                  apply(subscribeRequest, device, triggers, store)
              ], callback);
          } else {
              callback(new errors.SecurityInformationMissing(typeInformation.type));
          }
        });
    } else {
        subscribeRequest(device, triggers, store, options, callback);
    }
}

function subscribeRequest(device, triggers, store, options, callback){
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));
    request(options, createSubscriptionHandler(device, triggers, store, callback));
}

function addSecurityToken(options, token, callback){
    options.headers[config.getConfig().authentication.header] = token;
    return callback(null, options);
}

/**
 * Generate a new unsubscription request handler, based on the device and subscription ID given to the function.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 * @param {Function} callback   Callback to be called when the subscription handler ends.
 * @return {Function}           Returns a request handler for the given data.
 */
function createUnsuscribeHandler(device, id, callback) {
    return function(error, response, body) {
        if (error || !body) {
            logger.debug(
                context,
                'Transport error found subscribing device with id [%s] to entity [%s]', device.id, device.name);

            callback(error);

        } else if (response.statusCode !== 200 && response.statusCode !== 201) {
            logger.debug(
                context,
                'Unknown error subscribing device with id [%s] to entity [%s]: $s',
                response.statusCode);

            callback(new errors.EntityGenericError(device.name, device.type, {
                details: body
            }, response.statusCode));

        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion found subscribing device with id [%s] to entity [%s]: %s',
                device.id, device.name, body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else {
            device.subscriptions.splice(device.subscriptions.indexOf(id), 1);
            config.getRegistry().update(device, callback);
        }
    };
}

/**
 * Remove the subscription with the given ID from the Context Broker and from the device repository.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 */
function unsubscribe(device, id, callback) {
    var options = {
        method: 'POST',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.subservice
        },
        json: {
            subscriptionId: id
        }

    };

    if (device.cbHost && device.cbHost.indexOf('://') !== -1) {
        options.uri = device.cbHost + '/v1/unsubscribeContext';
    } else if (device.cbHost && device.cbHost.indexOf('://') === -1) {
        options.uri = 'http://' + device.cbHost + '/v1/unsubscribeContext';
    } else {
        options.uri = config.getConfig().contextBroker.url + '/v1/unsubscribeContext';
    }

    if (config.getConfig().authentication && config.getConfig().authentication.enabled) {
        config.getGroupRegistry().find(device.service, device.subservice, function(error, deviceGroup) {
          var typeInformation;
          if (deviceGroup) {
              typeInformation = deviceGroup;
          } else if (config.getConfig().types && config.getConfig().types[device.resource]){
              typeInformation = config.getConfig().types[device.resource];
          } else if (config.getConfig().types && config.getConfig().types[device.type]){
              typeInformation = config.getConfig().types[device.type];
          } else {
              typeInformation = device;
          }
          
          var security = config.getSecurityService();
          if (typeInformation && typeInformation.trust) {
              async.waterfall([
                  apply(security.auth, typeInformation.trust),
                  apply(security.getToken, typeInformation.trust),
                  apply(addSecurityToken, options),
                  apply(unsubscribeRequest, device, id)
              ], callback);
          } else {
              callback(new errors.SecurityInformationMissing(typeInformation.type));
          }
        });
    } else {
        unsubscribeRequest(device, id, options, callback);
    }

}

function unsubscribeRequest(device, id, options, callback){
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));
    request(options, createUnsuscribeHandler(device, id, callback));
}

exports.subscribe = intoTrans(context, subscribe);
exports.unsubscribe = intoTrans(context, unsubscribe);
