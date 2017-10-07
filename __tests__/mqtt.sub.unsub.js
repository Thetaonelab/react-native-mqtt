import { MqttClient } from '../src/index'
import { w3cwebsocket as webSocket } from 'websocket';


window = global


describe('Mqtt sub-unsub-pub', () => {
    beforeEach((done) => {
        MqttClient.connect({
            uri: 'wss://test.mosquitto.org:8081/',
            webSocket
        }, () => {
            console.log('MQTT Connected!')
            done()
        })
    })
    afterEach((done) => {
        MqttClient.disconnect(() => {
            done()
        })
    })

    test('Mqtt subscribe before connect', done => {
        var msg = { a: "b" }
        MqttClient.subscribe('Test', '/react-native/test', (topic, data) => {
            console.log({ data })
            expect(data).toEqual(msg);
            done()
        })
        MqttClient.publish('Test', '/react-native/test', msg)


        MqttClient.connect({
            uri: 'wss://test.mosquitto.org:8081/',
            webSocket: webSocket,
            ws: webSocket
        }, () => {
            console.log('MQTT Connected!')
        })
    });
})


test('[ Negative ] Mqtt subscribe retain after disconnect', done => {
    var msg = { a: "b" }
    console.log('================================|| ')
    MqttClient.connect({
        uri: 'wss://test.mosquitto.org:8081/',
        webSocket: webSocket
    }, () => {
        MqttClient.subscribe('Test', '/react-native/test', (topic, data) => {
            expect(data).not.toEqual(msg);
            done()
        })

        MqttClient.disconnect(() => {
            MqttClient.publish('Test', '/react-native/test', msg)

            /// PASS THE TEST CASE
            setTimeout(function () {
                done()
            }, 2000);
        })
    })
})
