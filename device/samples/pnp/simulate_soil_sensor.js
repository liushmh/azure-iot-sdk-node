// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const { random, min } = require('lodash');

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const ProvProtocol = require('azure-iot-provisioning-device-mqtt').Mqtt;

const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const ConnectionString = require('azure-iot-common').ConnectionString;
const SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;
const WeatherAPI = require('./weather');

// To see the dtdl of for this https://github.com/Azure/opendigitaltwins-dtdl

// String containing Hostname, Device Id & Device Key in the following formats:
//  'HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>'
let deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;

// DPS connection information
const provisioningHost = process.env.IOTHUB_DEVICE_DPS_ENDPOINT || 'global.azure-devices-provisioning.net';
const idScope = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE;
const registrationId = process.env.IOTHUB_DEVICE_DPS_DEVICE_ID;
const symmetricKey = process.env.IOTHUB_DEVICE_DPS_DEVICE_KEY;
const useDps = process.env.IOTHUB_DEVICE_SECURITY_TYPE;

const modelIdObject = { modelId: 'dtmi:com:example:Thermostat;1' };
const telemetrySendInterval = 30000;
const deviceSerialNum = 'jfa9a2c8808i';

// 云的密度系数0.8，日照时间 * 云的覆盖比例，约等于光照时长
function getLumination(clouds, sunrise, sunset) {
  return (100 - clouds * 0.8) * ((sunset - sunrise) / 3600) / 100;
}

function getRandom(num) {
  return num * Math.random() * (Math.round(Math.random()) * 2 - 1);
}

class DisplayValues{
  constructor(){
    this.count = 1;
    this.val = 0;
    this.max = 0;
    this.min = 0;
    this.avg = 0;
    this.total = this.val;
  }

  add(val){
    if(this.count == 1)
    {
      this.max = val;
      this.min = val;
    }
    this.count += 1;
    this.val = val;
    if(this.max < val) this.max = val;
    if(this.min > val) this.min = val;
    this.total += val;
    this.avg = this.total / (this.count - 1);
  }
}

class SoilSensor {
  constructor(city) {
    this.city = city;
    this.tempValues = new DisplayValues();
    this.humValues = new DisplayValues();
    this.lumValues = new DisplayValues();
    this.phValues = new DisplayValues();
    this.updateData();
    this.numberOfTemperatureReadings = 1;
  }

  // todo: add scheme json on the right
  getCurrentWeatherObject() {
    return {
      temperature: this.tempValues.val,
      avgTemperature: this.tempValues.avg,
      minTemperature: this.tempValues.min,
      maxTemperature: this.tempValues.max,

      humidity: this.humValues.val,
      avgHumidity: this.humValues.avg,
      minHumidity: this.humValues.min,
      maxHumidity: this.humValues.max,

      lumination: this.lumValues.val,
      avgLumination: this.lumValues.avg,
      minLumination: this.lumValues.min,
      maxLumination: this.lumValues.max,

      ph: this.phValues.val
    };
  }

  async updateData() {
    this.currWeather = await WeatherAPI.getWeather(this.city)
    if (this.currWeather) {
      this.tempValues.add(this.currWeather.main.temp);
      this.humValues.add(this.currWeather.main.humidity);
      this.lumValues.add(getLumination(this.currWeather.clouds.all, this.currWeather.sys.sunrise, this.currWeather.sys.sunset));
      this.phValues.add(7 + getRandom(1));
    }
  }

  updateSensor() {
    this.tempValues.add(this.tempValues.val + getRandom(0.1));
    this.humValues.add(this.humValues.val + getRandom(1));
    this.numberOfTemperatureReadings += 1;
    return this;
  }

  getLatestReport() {
    return {
      temperature: this.tempValues.val,
      humidity: this.humValues.val,
      lumination: this.lumValues.val,
      ph: this.phValues.val
    };
  }
}

async function main(city) {

  const soilSensor = new SoilSensor(city);
  const commandReport = 'getLatestReport';

  const propertyUpdateHandler = (deviceTwin, propertyName, reportedValue, desiredValue, version) => {
    console.log('Received an update for property: ' + propertyName + ' with value: ' + JSON.stringify(desiredValue));
    const patch = createReportPropPatch(
      {
        [propertyName]:
        {
          'value': desiredValue,
          'ac': 200,
          'ad': 'Successfully executed patch for ' + propertyName,
          'av': version
        }
      });
    updateComponentReportedProperties(deviceTwin, patch);
    console.log('updated the property');
  };

  const commandHandler = async (request, response) => {
    switch (request.methodName) {
      case commandReport: {
        console.log('Report ' + request.payload);
        await sendCommandResponse(request, response, 200, soilSensor.getLatestReport());
        break;
      }
      default:
        await sendCommandResponse(request, response, 404, 'unknown method');
        break;
    }
  };

  const sendCommandResponse = async (request, response, status, payload) => {
    try {
      await response.send(status, payload);
      console.log('Response to method \'' + request.methodName +
        '\' sent successfully.');
    } catch (err) {
      console.error('An error ocurred when sending a method response:\n' +
        err.toString());
    }
  };

  const createReportPropPatch = (propertiesToReport) => {
    let patch;
    patch = {};
    patch = propertiesToReport;
    console.log('The following properties will be updated for root interface:');
    console.log(patch);
    return patch;
  };

  const updateComponentReportedProperties = (deviceTwin, patch) => {
    deviceTwin.properties.reported.update(patch, function (err) {
      if (err) throw err;
      console.log('Properties have been reported for component');
    });
  };

  const desiredPropertyPatchHandler = (deviceTwin) => {
    deviceTwin.on('properties.desired', (delta) => {
      const versionProperty = delta.$version;

      Object.entries(delta).forEach(([propertyName, propertyValue]) => {
        if (propertyName !== '$version') {
          propertyUpdateHandler(deviceTwin, propertyName, null, propertyValue, versionProperty);
        }
      });
    });
  };

  let intervalToken, apiIntervalToken;

  const attachExitHandler = async (deviceClient) => {
    const standardInput = process.stdin;
    standardInput.setEncoding('utf-8');
    console.log('Please enter q or Q to exit sample.');
    standardInput.on('data', (data) => {
      if (data === 'q\n' || data === 'Q\n') {
        console.log('Clearing intervals and exiting sample.');
        clearInterval(intervalToken);
        clearInterval(apiIntervalToken);
        deviceClient.close();
        process.exit();
      } else {
        console.log('User Input was : ' + data);
        console.log('Please only enter q or Q to exit sample.');
      }
    });
  };

  async function sendTelemetry(deviceClient, index) {

    const msg = new Message(
      JSON.stringify(
        soilSensor.updateSensor().getCurrentWeatherObject()
      )
    );
    console.log(`Sending telemetry message ${index}...`);
    msg.contentType = 'application/json';
    msg.contentEncoding = 'utf-8';
    await deviceClient.sendEvent(msg);
  }

  async function provisionDevice(payload) {
    var provSecurityClient = new SymmetricKeySecurityClient(registrationId, symmetricKey);
    var provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvProtocol(), provSecurityClient);

    if (!!(payload)) {
      provisioningClient.setProvisioningPayload(payload);
    }

    try {
      let result = await provisioningClient.register();
      deviceConnectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
      console.log('registration succeeded');
      console.log('assigned hub=' + result.assignedHub);
      console.log('deviceId=' + result.deviceId);
      console.log('payload=' + JSON.stringify(result.payload));
    } catch (err) {
      console.error("error registering device: " + err.toString());
    }
  }

  // If the user include a provision host then use DPS
  if (useDps === 'DPS') {
    await provisionDevice(modelIdObject);
  } else if (useDps === 'connectionString') {
    try {
      if (!(deviceConnectionString && ConnectionString.parse(deviceConnectionString, ['HostName', 'DeviceId']))) {
        console.error('Connection string was not specified.');
        process.exit(1);
      }
    } catch (err) {
      console.error('Invalid connection string specified.');
      process.exit(1);
    }
  } else {
    console.log('No proper SECURITY TYPE provided.');
    process.exit(1);
  }

  // fromConnectionString must specify a transport, coming from any transport package.
  const client = Client.fromConnectionString(deviceConnectionString, Protocol);

  console.log('Connecting using connection string ' + deviceConnectionString);
  let resultTwin;
  try {
    // Add the modelId here
    await client.setOptions(modelIdObject);
    await client.open();
    console.log('Enabling the commands on the client');
    client.onDeviceMethod(commandReport, commandHandler);

    // Send Telemetry every 10 secs
    let index = 0;
    intervalToken = setInterval(() => {
      sendTelemetry(client, index).catch((err) => console.log('error', err.toString()));
      index += 1;
    }, telemetrySendInterval);

    const updateAPIInterval = 1800;
    apiIntervalToken = setInterval(() => {
      soilSensor.updateData();
    }, updateAPIInterval * 1000);

    // attach a standard input exit listener
    attachExitHandler(client);

    // Deal with twin
    try {
      resultTwin = await client.getTwin();
      const patchRoot = createReportPropPatch({ serialNumber: deviceSerialNum });

      // the below things can only happen once the twin is there
      updateComponentReportedProperties(resultTwin, patchRoot);

      // Setup the handler for desired properties
      desiredPropertyPatchHandler(resultTwin);

    } catch (err) {
      console.error('could not retrieve twin or report twin properties\n' + err.toString());
    }
  } catch (err) {
    console.error('could not connect Plug and Play client or could not attach interval function for telemetry\n' + err.toString());
  }
}

require('yargs')
  .command(
    'c <city>',
    'Input city.',
    {},
    opts => {
      main(opts.city).then(() => console.log('executed sample')).catch((err) => console.log('error', err))
    }
  ).strict().argv;
