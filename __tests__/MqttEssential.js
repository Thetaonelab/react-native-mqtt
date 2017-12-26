
// import * as RNPaho from 'react-native-paho-mqtt'
// import chalk from 'chalk'
import React from 'react'
import { shallow } from 'enzyme'
import { w3cwebsocket as webSocket } from 'websocket';


// jest.mock('react-native-paho-mqtt')

jest.setTimeout(30000)

function createStore() {
  let myMqttStorage = {}
  return {
    setItem: (key, item) => {
      myMqttStorage[key] = item
    },
    getItem: (key) => myMqttStorage[key],
    removeItem: (key) => {
      delete myMqttStorage[key]
    },
    clear: () => {
      myMqttStorage = {}
    }
  }
}

const myStore = createStore()

class MockedView extends React.Component {
  render() {
    return (<div>Fake Component</div>)
  }
}

const connectMqttStore = require('../src/MqttStoreConnect').default
const MqttEssential = require('../src/MqttEssential').default

describe.skip('connectMqttStore', () => {
  const mqttConnectOptions = {
    uri: 'wss://mymqtt.url',
    username: 'user1',
    password: 'pass1'
  }
  const defaultTopic = '/path/to/default/topic'
  const store = 'message'
  var wrapper, WrappedComponent
  let mqttCallbackCalled = false

  beforeAll(() => {
    MqttEssential.connect({
      ...mqttConnectOptions,
      storage: myStore
    }, () => {
      mqttCallbackCalled = true
    })
  })

  beforeEach(() => {
    WrappedComponent = connectMqttStore(MockedView, [{
      storeName: store,
      defaultTopic: defaultTopic
    }])
    wrapper = shallow(<WrappedComponent />, {
      lifecycleExperimental: true
    })
  })

  afterEach(() => {
    myStore.clear()
    //   // isClientConnected = false
    //   // RNPaho.Client.mock.instances.forEach(i => i.disconnect())
    //   // RNPaho.Message.mock.mockClear()
    //   // RNPaho.Client.mock.mockClear()
  })

  it('calls Client ctor & connect with appripriate params and only once', () => {
    expect(mqttCallbackCalled).toBeTruthy()
    expect(RNPaho.Client).toHaveBeenCalledTimes(1)
    expect(RNPaho.Client.mock.calls[0][0].uri).toBe(mqttConnectOptions.uri)
    expect(RNPaho.Client.mock.calls[0][0].clientId.startsWith(mqttConnectOptions.username)).toBeTruthy()
    expect(RNPaho.Client.mock.calls[0][0].storage).toBe(myStore)

    expect(RNPaho.my_connect).toHaveBeenCalledTimes(1)
    expect(RNPaho.my_connect).toHaveBeenCalledWith({ userName: mqttConnectOptions.username, password: mqttConnectOptions.password })
  })

  it('Only renders the wrapped Component', () => {
    expect(wrapper.is(MockedView)).toBeTruthy()
    // expect(wrapper.instance().displayName).toEqual('MqttStoreConnectWrapper(MockedView)')
    expect(wrapper.unrendered.type.displayName).toBe('MqttStoreConnectWrapper(MockedView)')
  })

  it('Passes correct props', () => {
    const viewInstanceProps = wrapper.props()
    expect(viewInstanceProps).toEqual(expect.objectContaining({
      addTopicToStore: expect.any(Function),
      message: expect.anything(),
      removeTopicFromStore: expect.any(Function),
      removeAllTopicFromStore: expect.any(Function),
      sendMessage: expect.any(Function)
    }))
  })

  it('Subscribe to topic & send/recieve message', () => {
    const topic = '/path/to/topic'
    const payload = { hello: 'world' }
    const payloadString = JSON.stringify(payload)
    const viewInstanceProps = wrapper.props()

    return new Promise((resolve, reject) => {
      viewInstanceProps.addTopicToStore(store, topic)
      setTimeout(() => {
        expect(RNPaho.my_subscribe).toHaveBeenCalledWith(topic)
        viewInstanceProps.sendMessage(topic, payloadString)

        setTimeout(() => {
          // console.log(chalk.black.bold.bgYellow('timeout: addTopicToStore'), (Date.now() - aTStoreTimeStamp))
          // console.log(chalk.black.bold.bgYellow('props:'), wrapper.props())
          // console.log(chalk.red.bold('subscribe.mock.calls'), subscribe.mock.calls)
          // console.log(chalk.red.bold('send.mock.calls'), send.mock.calls)
          expect(RNPaho.my_send.mock.calls.some(args => {
            if (args.length === 0) {
              return false
            }
            const messageObj = args[0]
            if (messageObj.message === payloadString && messageObj.destinationName === topic) {
              return true
            }
          })).toEqual(true)
          expect(wrapper.props()).toMatchObject({
            message: payload
          })
          setTimeout(resolve, 0, true)
        }, 1100)
      }, 1200)
    })
  })

  it('remove particular topic', () => {
    const topic = '/path/another/topic'
    const payload = { key: 'value for key' }
    const payloadString = JSON.stringify(payload)
    const viewInstanceProps = wrapper.props()

    return new Promise((resolve, reject) => {
      viewInstanceProps.addTopicToStore(store, topic)
      setTimeout(() => {
        expect(RNPaho.my_subscribe).toHaveBeenCalledWith(topic)
        viewInstanceProps.removeTopicFromStore(store, topic)
        setTimeout(() => {
          expect(RNPaho.my_unsubscribe).toHaveBeenCalledWith(topic)
          viewInstanceProps.sendMessage(topic, payloadString)
          // setTimeout(() => {
          expect(wrapper.props().message).not.toMatchObject(payload)
          setTimeout(resolve, 0, true)
          // }, 1000)
        }, 1100)
      }, 1200)
    })
  })

  it('removes all topic', () => {
    const topics = ['path/to/topic/1', 'path/to/topic/2', 'path/to/topic/3', 'path/to/topic/4']
    const payload = { msgKey1multiTopic: 'i am subscribed to multiple topic' }
    const payloadString = JSON.stringify(payload)
    const viewInstanceProps = wrapper.props()

    const topicsAsParams = topics.map(v => [v])

    return new Promise((resolve, reject) => {
      topics.forEach(topic => viewInstanceProps.addTopicToStore(store, topic))

      setTimeout(() => {
        try { expect(RNPaho.my_subscribe.mock.calls).toEqual(expect.arrayContaining(topicsAsParams)) } catch (err) { return reject(err) }
        viewInstanceProps.removeAllTopicFromStore(store)
        setTimeout(() => {
          try { expect(RNPaho.my_unsubscribe.mock.calls).toEqual(expect.arrayContaining(topicsAsParams)) } catch (err) { return reject(err) }
          viewInstanceProps.sendMessage(topics[1], payloadString)
          setTimeout(() => {
            try { expect(wrapper.props().message).not.toMatchObject(payload) } catch (err) { return reject(err) }
            resolve(true)
          }, 1100)
        }, 1200)
      }, 1200)
    })
  })

  it('removes topic, not added to store', () => {
    const topic = 'path/to/not/added/topic'
    const viewInstanceProps = wrapper.props()
    return new Promise((resolve, reject) => {
      viewInstanceProps.removeTopicFromStore(store, topic)
      setTimeout(() => {
        expect(1).toBeTruthy()
        resolve(true)
      }, 1500)
    })
  })

  it('returns all published json keys', () => {
    const topic = 'topic/to/multiple/key/retain/test'
    const payload1 = { key1: 'value for key 1' }
    const payload2 = { key2: 'value for key 2' }
    const viewInstanceProps = wrapper.props()

    return new Promise((resolve, reject) => {
      viewInstanceProps.addTopicToStore(store, topic)
      setTimeout(() => {
        viewInstanceProps.sendMessage(topic, payload1)
        viewInstanceProps.sendMessage(topic, payload2)
        setTimeout(() => {
          expect(wrapper.props()[store]).toMatchObject({ ...payload1, ...payload2 })
          resolve(true)
        }, 1100)
      }, 1200)
    })
  })

  it('removes all topic on unmount', () => {
    const topics = ['path/to/topic/unsub-test-2-1', 'path/to/topic/unsub-test-2-2', 'path/to/topic/unsub-test-2-3', 'path/to/topic/unsub-test-2-4']
    const viewInstanceProps = wrapper.props()
    const topicsAsParams = topics.map(v => [v])

    return new Promise((resolve, reject) => {
      topics.forEach(topic => viewInstanceProps.addTopicToStore(store, topic))
      setTimeout(() => {
        try { expect(RNPaho.my_subscribe.mock.calls).toEqual(expect.arrayContaining(topicsAsParams)) } catch (err) { return reject(err) }
        wrapper.unmount()

        setTimeout(() => {
          try { expect(RNPaho.my_unsubscribe.mock.calls).toEqual(expect.arrayContaining(topicsAsParams)) } catch (err) { return reject(err) }
          resolve(true)
        }, 1100)
      }, 1200)
    })
  })

  it('preserves msg not parserable as json', () => {
    const viewInstanceProps = wrapper.props()
    const payload = 'hello world 321'

    return new Promise((resolve, reject) => {
      viewInstanceProps.sendMessage(defaultTopic, payload)
      setTimeout(() => {
        try { expect(wrapper.props()[store]).toEqual({ data: payload }) } catch (err) { return reject(err) }
        resolve(true)
      }, 1500)
    })
  })

  it.skip('subscribes only once if same topic is added twice', () => {
    const viewInstanceProps = wrapper.props()
    const topic = 'this/topic/willbe/added/twice'
    return new Promise((resolve, reject) => {
      viewInstanceProps.addTopicToStore(store, topic)
      setTimeout(() => {
        try { expect(RNPaho.my_subscribe).toHaveBeenCalledWith(topic) } catch (err) { return reject(err) }
        viewInstanceProps.addTopicToStore(store, topic)
        setTimeout(() => {
          try { expect(RNPaho.my_subscribe.mock.calls.filter(args => args.length && args[0] === topic)).toHaveLength(1) } catch (err) { return reject(err) }
          resolve(true)
        }, 1100)
      }, 1200)
    })
  })
})

describe.skip('connectMqttStore selector', () => {
  const mqttConnectOptions = {
    uri: 'wss://lbs.eyezon.in:9901/',
    username: 'mqttlibtest',
    password: 'testdeviceisonlyfortesting123',
    webSocket
  }
  const defaultTopic = '/path/to/default/topic'
  const store = 'message'

  beforeAll(() => {
    MqttEssential.connect({
      ...mqttConnectOptions,
      storage: myStore
    }, () => {})
  })

  it('props initializes data with empty object', () => {
    const constMsg = {
      theConstKey: 'The const msg 1',
      theConstKeyA: 'The const msg 2'
    }
    const WrappedComponent = connectMqttStore(MockedView, [{
      storeName: store,
      defaultTopic: defaultTopic,
      selectData: (data) => constMsg
    }])
    const wrapper = shallow(<WrappedComponent />, {
      lifecycleExperimental: true
    })
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try { expect(wrapper.props()[store]).toEqual({}) } catch (err) { reject(err) }
        resolve(true)
      }, 1500)
    })
  })

  it('props gets from seletector', () => {
    const constMsg = {
      theConstKey: 'The const msg 1',
      theConstKeyA: 'The const msg 2'
    }
    const WrappedComponent = connectMqttStore(MockedView, [{
      storeName: store,
      defaultTopic: defaultTopic,
      selectData: (data) => constMsg
    }])
    const wrapper = shallow(<WrappedComponent />, {
      lifecycleExperimental: true
    })

    return new Promise((resolve, reject) => {
      wrapper.props().sendMessage(defaultTopic, {my: 'msg'})
      setTimeout(() => {
        try { expect(wrapper.props()[store]).toEqual(constMsg) } catch (err) { return reject(err) }
        resolve(true)
      }, 1500)
    })
  })

  it.skip('same key from selector and mqttstore gets overeiden by of selectors', () => {
    return new Promise((resolve, reject) => {
      resolve(true)
    })
  })
})
