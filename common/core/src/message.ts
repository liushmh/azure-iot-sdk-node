/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

import { Properties } from './properties';

/**
 * The {@link azure-iot-common.Message} object is used for telemetry (device-to-cloud) and commands (cloud-to-device) asynchronous
 * messaging between the device and the IoT Hub service. It is transport-agnostic, meaning it works the same way over AMQP, MQTT and HTTP.
 */
export class Message {
  data: any;
  /**
   * A map containing string keys and values for storing custom message properties.
   */
  properties: Properties;
  /**
   * Used to correlate two-way communication. Format: A case-sensitive string (up to 128 char long) of ASCII 7-bit alphanumeric chars and the following special symbols: <br/>`- : . + % _ # * ? ! ( ) , = @ ; $ '`.
   */
  messageId: string;
  /**
   * Destination of the message.
   */
  to: string;
  /**
   * Expiry time in UTC interpreted by hub on C2D messages. Ignored in other cases.
   */
  expiryTimeUtc: any;
  /**
   * Used to Abandon, Reject or Accept the message
   */
  lockToken: string;
  /**
   * Used in message responses and feedback
   */
  correlationId: string;
  /**
   * Used to specify the entity creating the message
   */
  userId: string;
  /**
   * Type of feedback requested (in case of cloud-to-device command)
   */
  ack: string;
  /**
   * Name of input channel for message
   */
  inputName: string;
  /**
   * Name of output channel for message
   */
  outputName: string;

  /**
   * @private
   */
  transportObj: any;

  /**
   * Creates a new {@link azure-iot-common.Message} object
   * @constructor
   * @param data a Node [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer}
   *             object or anything that can be passed to the [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer} constructor
   *             to construct a [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer} from.
   */
  /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_004: [The Message constructor shall accept a variable message that will be transmitted.]*/
  constructor(data: Message.BufferConvertible) {
    this.data = data;

    this.properties = new Properties();
    this.messageId = '';
    this.to = '';
    this.expiryTimeUtc = undefined;
    this.lockToken = '';
    this.correlationId = '';
    this.userId = '';
  }

  /**
   * Gets the content (body) of the {@link azure-iot-common.Message}.
   *
   * @returns {*} The content of the {@link azure-iot-common.Message}.
   */
  getData(): Message.BufferConvertible {
    /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_003: [The getData function shall return a representation of the body of the message as the type that was presented during construction.]*/
    return this.data;
  };

  /**
   * Gets the data passed to the constructor as a [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer}
   *
   * @returns {Buffer}
   */
  getBytes(): Buffer {
    if (Buffer.isBuffer(this.data) ) {
      /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_001: [If the data message that is store is of type Buffer then the data object will get returned unaltered.]*/
      return this.data;
    } else {
      /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_002: [If the data message is of any other type then the data will be converted to a Buffer object and returned.]*/
      return new Buffer(this.data);
    }
  };

}

export namespace Message {
  export type BufferConvertible = Buffer | String | any[] | ArrayBuffer;

}
