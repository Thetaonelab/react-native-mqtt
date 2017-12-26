import { MqttClient } from '../src/index'
import { w3cwebsocket as webSocket } from 'websocket';

jest.unmock('react-native-paho-mqtt')

jest.setTimeout(20000);

beforeAll((done) => {
    MqttClient.connect({
        uri: 'wss://lbs.eyezon.in:9901/',
        username: 'mqttlibtest',
        password: 'testdeviceisonlyfortesting123',
        webSocket
    }, () => {
        console.log('MQTT Connected!')
        done()
    })
})
afterAll((done) => {
    MqttClient.disconnect(() => done())
})

test('Mqtt loopback', done => {
    var msg = { a: "b" }
    MqttClient.subscribe('Test', '/react-native/test', (topic, data) => {
        console.log({ data })
        expect(data).toEqual(msg);
        done();
    })

    MqttClient.publish('Test', '/react-native/test', msg)

});


test('Mqtt loopback - benchmark', done => {
    for (var i = 0; i < 10; i++) {
        var msg = { a: i }
        MqttClient.subscribe('Test', '/react-native/test' + i, (topic, data) => {
            if (data.a === 9) {
                expect(data.a).toEqual(9);
                done();
            }
        })
    }

    for (var i = 0; i < 10; i++) {
        var msg = { a: i }
        MqttClient.publish('Test', '/react-native/test' + i, msg)
    }

});

