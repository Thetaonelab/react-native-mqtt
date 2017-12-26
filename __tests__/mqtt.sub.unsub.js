import { MqttClient } from '../src/index'
import { w3cwebsocket as webSocket } from 'websocket';

jest.unmock('react_native_mqtt')
jest.setTimeout(60000)

describe('Mqtt sub-unsub-pub', () => {
    beforeEach((done) => {
        console.log('MqttClient.connect **')
        MqttClient.connect({
            uri: 'wss://lbs.eyezon.in:9901/',
            username: 'mqttlibtest',
            password: 'testdeviceisonlyfortesting123',
            webSocket
        }, () => {
            console.log('MQTT Connected!')
            setTimeout(done, 100)
        })
    })
    afterEach((done) => {
        MqttClient.disconnect(() => {
            setImmediate(done)
        })
    })

    test('Mqtt subscribe before connect', (done) => {
        var msg = { a: "b" }
        MqttClient.subscribe('Test', '/react-native/test', (topic, data) => {
            expect(data).toEqual(msg)
            done()
        })
        MqttClient.publish('Test', '/react-native/test', msg)
    });

    test('[ Negative ] Mqtt subscribe retain after disconnect', done => {
        var msg = { a: "b" }
        MqttClient.subscribe('Test', '/react-native/test_1', (topic, data) => {
            expect(data).not.toEqual(msg);
            done()
        })
        setTimeout(
            MqttClient.disconnect,
            1000,
            () => {
                MqttClient.publish('Test', '/react-native/test_1', msg)
                setTimeout(done, 2200)
            }
        )
    })
})

// Mqtt close websocket test
