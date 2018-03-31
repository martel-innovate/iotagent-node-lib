# Installation & Administration Guide

## <a name="configuration"/> Configuration
The `activate()` function that starts the IoT Agent receives as single parameter with the configuration for the IoT Agent.
The Agent Console reads the same configuration from the `config.js` file.

### Global Configuration
These are the parameters that can be configured in the global section:
* **logLevel**: minimum log level to log. May take one of the following values: DEBUG, INFO, ERROR, FATAL. E.g.: 'DEBUG'.
* **contextBroker**: connection data to the Context Broker (host and port). E.g.:
```
	{
	host: '192.168.56.101',
	port: '1026'
    	}
```
* **server**: configuration used to create the Context Server (port where the IoT Agent will be listening as a Context Provider and base root to prefix all the paths). The `port` attribute is required. If no `baseRoot` attribute is used, '/' is used by default. E.g.:
```
	{
	baseRoot: '/',
        port: 4041
    	}
```
* **stats**: configure the periodic collection of statistics. Use `interval` in milliseconds to set the time between stats writings.
```
    stats: {
        interval: 100
    }
```
* **authentication**: authentication data, for use in retrieving tokens for devices with a trust token (required in scenarios with security enabled in the Context Broker side). 
  Currently, two authentication provider are supported: `keystone` and `oauth2`. Authentication need to be enabled by setting the field `enabled` to `true`. 
  In `keystone` based authentication, the `trust` associated to the `device` or `deviceGroup` is a token representing a specific user and his rights on a given domain (i.e.
  combination of `fiware-service` and `fiware-servicepath`). The authentication process use the trust delegation workflow to check if the trust provided is valid, in which
  case return a `x-subject-token` that can be used to authenticate the request to the Context Broker. Required parameters are: the `url` of the keystone to be used
  (alternatively `host` and `port` but if you use this combination, the IoT Agent will assume that the protocol is HTTP), the `user` and `password` to which it is delegated
  the `trust` verification.
  E.g.:
    ```
    {
          enabled: true,
          url: 'https://localhost:5000',
          type: 'keystone',
          user: 'iotagent',
          password: 'iotagent'
    }
    ```
  In `oauth2` based authentication, the `trust` associated to the `device` or `deviceGroup` is a `refresh_token` issued by a specific user for the Context Broker client. 
  The authentication process use the [`refresh_token` grant type](https://tools.ietf.org/html/rfc6749#section-1.5) to obtain an `access_token`
  that can be used to authenticate the request to the Context Broker.
  At the time being the assumption is that the `refresh_token` is a not expiring `offline_token` (we believe this is the best solution in the case of IoT Devices,
  since injecting a refresh token look may slow down communication. Still the developer would be able to invalidate the refresh token on the provider side in
  case of security issues connected to a token). The code was tested using [Keycloak](http://www.keycloak.org) and [Auth0](https://auth0.com) (it may require customisation
  for other providers - while OAuth2 is a standard, not all implementations behave in the same way, especially as regards status codes and error messages).
  Required parameters are: the `url` of the OAuth 2 provider to be used (alternatively `host` and `port` but if you use this combination, the IoT Agent will assume
  that the protocol is HTTP), the `tokenPath` to which the validation request should be sent, the `clientId` and `clientSecret` that identify the Context Broker,
  and the `header` field that should be used to send the authentication request (that will be send in the form `Authorization: Bearer <access_token>`).
  E.g.:
    ```
    {
        enabled: true,
        type: 'oauth2',
        url: 'http://localhost:3000',
        header: 'Authorization',
        clientId: 'context-broker',
        clientSecret: 'c8d58d16-0a42-400e-9765-f32e154a5a9e',
        tokenPath: '/auth/realms/default/protocol/openid-connect/token'
    }
    ```
* **deviceRegistry**: type of Device Registry to create. Currently, two values are supported: `memory` and `mongodb`. If the former is configured, a transient memory-based device registry will be used to register all the devices. This registry will be emptied whenever the process is restarted. If the latter is selected, a MongoDB database will be used to store all the device information, so it will be persistent from one execution to the other. Mongodb databases must be configured in the `mongob` section (as described bellow). E.g.:
```
{
  type: 'mongodb'
}
```
* **mongodb**: configures the MongoDB driver for those repositories with 'mongodb' type. If the `host` parameter is a list of comma-separated IPs, they will
be considered to be part of a Replica Set. In that case, the optional property `replicaSet` should contain the Replica Set name. The MongoBD driver will
retry the connection at startup time `retries` times, waiting `retryTime` seconds between attempts, if those attributes are present (default values
are 5 and 5 respectively). E.g.:
```
{
  host: 'localhost',
  port: '27017',
  db: 'iotagent',
  retries: 5,
  retryTime: 5

}
```
* **iotManager**: configures all the information needed to register the IoT Agent in the IoTManager. If this section is
 present, the IoTA will try to register to a IoTAM in the `host`, `port` and `path` indicated, with the information
 configured in the object. The IoTAgent URL that will be reported will be the `providedUrl` (described below) with the
 added `agentPath`:
```
{
    host: 'mockediotam.com',
    port: 9876,
    path: '/protocols',
    protocol: 'GENERIC_PROTOCOL',
    description: 'A generic protocol',
    agentPath: '/iot'
}
```
* **types**: See **Type Configuration** in the [Configuration API](#configurationapi) section below.
* **eventType**: Default type for the Events (useful only with the `addEvents` plugin).
* **service**: default service for the IoT Agent. If a device is being registered, and no service information comes with the device data, and no service information is configured for the given type, the default IoT agent service will be used instead. E.g.: 'smartGondor'.
* **subservice**: default subservice for the IoT Agent. If a device is being registered, and no subservice information comes with the device data, and no subservice information is configured for the given type, the default IoT agent subservice will be used instead. E.g.: '/gardens'.
* **providerUrl**: URL to send in the Context Provider registration requests. Should represent the external IP of the deployed IoT Agent (the IP where the Context Broker will redirect the NGSI requests). E.g.: 'http://192.168.56.1:4041'.
* **deviceRegistrationDuration**: duration of the registrations as Context Providers, in [ISO 8601](http://en.wikipedia.org/wiki/ISO_8601) standard format. E.g.: 'P1M'.
* **iotaVersion**: indicates the version of the IoTA that will be displayed in the about method (it should be filled automatically by each IoTA).
* **appendMode**: if this flag is activated, the update requests to the Context Broker will be performed always with APPEND type, instead of the default UPDATE. This
have implications in the use of attributes with Context Providers, so this flag should be used with care.
* **dieOnUnexpectedError**: if this flag is activated, the IoTAgent will not capture global exception, thus dying upon any unexpected error.
* **singleConfigurationMode**: enables the Single Configuration mode for backwards compatibility (see description in the Overview). Default to false.
* **timestamp**: if this flag is activated, the IoT Agent will add a 'TimeInstant' metadata attribute to all the attributes updateded from device information.
* **defaultResource**: default string to use as resource for the registration of new Configurations (if no resource is provided).
* **defaultKey**: default string to use as API Key for devices that do not belong to a particular Configuration.
* **componentName**: default string identifying the component name for this IoT Agent in the logs.
* **pollingExpiration**: expiration time for commands waiting in the polling queue in miliseconds. If a command has been in the queue for this amount of time without
being collected by the device, the expiration daemon will reclaim it. This attribute is optional (if it doesn't exist, commands won't expire).
* **pollingDaemonFrequency**: time between collection of expired commands in milliseconds. This attribute is optional
(if this parameter doesn't exist the polling daemon won't be started).

### Configuration using environment variables
Some of the configuration parameters can be overriden with environment variables, to ease the use of those parameters with
container-based technologies, like Docker, Heroku, etc...

The following table shows the accepted environment variables, as well as the configuration parameter the variable overrides.

| Environment variable      | Configuration attribute             |
|:------------------------- |:----------------------------------- |
| IOTA_CB_URL               | contextBroker.url                   |
| IOTA_CB_HOST              | contextBroker.host                  |
| IOTA_CB_PORT              | contextBroker.port                  |
| IOTA_NORTH_HOST           | server.host                         |
| IOTA_NORTH_PORT           | server.port                         |
| IOTA_PROVIDER_URL         | providerUrl                         |
| IOTA_REGISTRY_TYPE        | deviceRegistry.type                 |
| IOTA_LOG_LEVEL            | logLevel                            |
| IOTA_TIMESTAMP            | timestamp                           |
| IOTA_IOTAM_URL            | iotManager.url                      |
| IOTA_IOTAM_HOST           | iotManager.host                     |
| IOTA_IOTAM_PORT           | iotManager.port                     |
| IOTA_IOTAM_PATH           | iotManager.path                     |
| IOTA_IOTAM_AGENTPATH      | iotManager.agentPath                |
| IOTA_IOTAM_PROTOCOL       | iotManager.protocol                 |
| IOTA_IOTAM_DESCRIPTION    | iotManager.description              |
| IOTA_MONGO_HOST           | mongodb.host                        |
| IOTA_MONGO_PORT           | mongodb.port                        |
| IOTA_MONGO_DB             | mongodb.db                          |
| IOTA_MONGO_REPLICASET     | mongodb.replicaSet                  |
| IOTA_MONGO_RETRIES        | mongodb.retries                     |
| IOTA_MONGO_RETRY_TIME     | mongodb.retryTime                   |
| IOTA_SINGLE_MODE          | singleConfigurationMode             |
| IOTA_APPEND_MODE          | appendMode                          |
| IOTA_POLLING_EXPIRATION   | pollingExpiration                   |
| IOTA_POLLING_DAEMON_FREQ  | pollingDaemonFrequency              |
