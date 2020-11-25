 #!/bin/bash
export IOTHUB_DEVICE_SECURITY_TYPE=DPS
export IOTHUB_DEVICE_DPS_ID_SCOPE=0ne001C97C5
export IOTHUB_DEVICE_DPS_DEVICE_ID=$2
device_key=$(az iot central device compute-device-key  --device-id $2 --pk TNHa7ATsY54FJU52Q4N9HDLpaA0DW0MP7/wJP3UHi6jgNEuejpNDBcXdRefaW2Vq7vUv8he11c2jc6jlHMJiWA== | sed 's/^"\(.*\)".*/\1/' )

export IOTHUB_DEVICE_DPS_DEVICE_KEY=$device_key
export IOTHUB_DEVICE_DPS_ENDPOINT=global.azure-devices-provisioning.net

node $1 c $3

# ./sample_run.sh ./device/samples/pnp/simple_thermostat.js 2gos8xvnx0v
# ./sample_run.sh ./device/samples/pnp/simulate_soil_sensor.js vgc0dqerar haikou