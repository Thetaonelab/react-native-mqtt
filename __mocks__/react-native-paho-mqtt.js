/* eslint-env jest */
/* eslint-disable camelcase */
// import reactNativePahoMqtt from 'react-native-paho-mqtt'
// import EventEmiter from 'event-emiter'

const RNPaho = jest.genMockFromModule('react-native-paho-mqtt')

RNPaho.Message.mockImplementation((message) => {
  // console.log(chalk.red.bold('Message:mock'), message)
  const ret = Object.create(null)
  ret.message = message
  return ret
})

export let isClientConnected = true
export const my_connect = jest.fn().mockImplementation(options => {
  isClientConnected = true
  return Promise.resolve(true)
})

export const my_client = Object.create(null)
const _clientConnected = jest.fn()
  .mockImplementation(() => isClientConnected)
Object.defineProperty(my_client, '_client', {
  value: {
    get clientConnected () {
      return isClientConnected
    }
  }
})
Object.defineProperty(my_client, 'connected', {
  get: _clientConnected
})

export const my_disconnect = jest.fn().mockImplementation(options => {
  isClientConnected = false
  listenersMap.clear()
  return Promise.resolve(true)
})

const listenersMap = new Map()
export const my_on = jest.fn().mockImplementation((event, callback) => {
  // console.log('Listener attatched for', event)
  if (!listenersMap.has(event)) {
    listenersMap.set(event, [])
  }
  listenersMap.get(event).push(callback)
})

export const my_subscribe = jest.fn().mockImplementation(topic => {
  // console.log('xxxx subscribe', topic)
  return Promise.resolve(true)
})

export const my_unsubscribe = jest.fn().mockImplementation(topic => {
  return Promise.resolve(true)
})

export const my_send = jest.fn().mockImplementation((message) => {
  // console.log('registered listeners', my_on.mock.calls)
  setTimeout(() => {
    const cbSet = listenersMap.get('messageReceived')
    // console.log(chalk.bgRed.white.bold('Calling cb'), message, message.mock)
    // console.log({cbSet})
    cbSet.forEach(callback => {
      // eslint-disable-next-line
      callback({
        _destinationName: message.destinationName,
        payloadString: message.message
      })
    })
  }, 20)
})

RNPaho.Client.mockImplementation(() => {
  // console.warn('RNPaho mockImplementation')

  return {
    connect: my_connect,
    _client: my_client,
    disconnect: my_disconnect,
    on: my_on,
    subscribe: my_subscribe,
    unsubscribe: my_unsubscribe,
    send: my_send
  }
})

Object.assign(RNPaho, {
  my_connect,
  my_client,
  my_disconnect,
  my_on,
  my_subscribe,
  my_unsubscribe,
  my_send
})

// export default RNPaho
module.exports = RNPaho
