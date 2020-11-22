 #!/bin/bash
export IOTHUB_DEVICE_SECURITY_TYPE=DPS
export IOTHUB_DEVICE_DPS_ID_SCOPE=0ne001C97C5
export IOTHUB_DEVICE_DPS_DEVICE_ID=$2
device_key=$(az iot central device compute-device-key  --device-id $2 --pk TNHa7ATsY54FJU52Q4N9HDLpaA0DW0MP7/wJP3UHi6jgNEuejpNDBcXdRefaW2Vq7vUv8he11c2jc6jlHMJiWA== | sed 's/^"\(.*\)".*/\1/' )
echo $device_key
export IOTHUB_DEVICE_DPS_DEVICE_KEY=$device_key
export IOTHUB_DEVICE_DPS_ENDPOINT=global.azure-devices-provisioning.net

node $1

 # ./sample_run.sh 2gos8xvnx0v ./device/samples/pnp/simple_thermostat.js