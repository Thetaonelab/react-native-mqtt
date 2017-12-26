// import init from 'react_native_mqtt';
// import { Message, Client } from 'react-native-paho-mqtt'
// import { AsyncStorage } from 'react-native'

var pubsubQueue = []
var clientIdSuff = Math.random().toString(16).substr(2, 18) + ''
var DEFAULT_COMPONENT_ID = '12fd3-jhdg4-jhdys-hdk42'

function enqueue(obj) {
  pubsubQueue.push(obj)
}

var pubsubWorkerRunning = false

var pubsubWorker = async () => {
  pubsubWorkerRunning = true
  var timeout = 0
  var front = pubsubQueue[0]

  if (front) {
    try {
      if (front.type === 'SUB') {
        console.log('GOING TO SUB!!')
        await sub(front.componentId, front.topic, front.callback)
        timeout = 0
      } else if (front.type === 'UNSUB') {
        console.log('GOING TO UNSUB!!')
        await unsub(front.componentId, front.topic)
        timeout = 0
      }
      else if (front.type === 'PUB') {
        console.log('GOING TO PUB!!')
        pub(front.componentId, front.topic, front.message, front.qos, front.retained)
        timeout = 0
      }
      pubsubQueue.shift(1)
    } catch (ex) {
      console.log(ex)
      timeout = 3000

      //// TRY TO CONNECT 
      if (saveConf) {
        /* console.log('WILL TRY TO CONNECT IN 1 SEC')
        setTimeout(function () {
          console.log('WILL TRY CONNECTING')
          connect(saveConf)
        }, 1000) */
      }

    }
  } else {
    timeout = 1000
  }

  setTimeout(function () {
    pubsubWorker()
  }, timeout)
}

if (!pubsubWorkerRunning) { pubsubWorker() }

const myStorage = {
  setItem: (key, item) => {
    myStorage[key] = item
  },
  getItem: (key) => myStorage[key],
  removeItem: (key) => {
    delete myStorage[key]
  }
}

let init = null
var subscribedTopicCallback = {}
var mqttClient = null
var saveConf

function connect(conf, afterConnect) {

  if (conf.webSocket) {
    global.WebSocket = conf.webSocket
  }
  window = global // react_native_mqtt assigns Paho Object to window

  if (init === null) {
    init = require('react_native_mqtt').default
    init({})
  }


  console.log('TRYING TO CONNECT TO MQTT! (1)', mqttClient ? mqttClient.isConnected() : null)
  if (mqttClient && mqttClient.isConnected()) {
    console.log('MQTT ALREADY CONNECTED!')
    return
  }

  saveConf = conf

  if (!mqttClient) {
    mqttClient = new Paho.MQTT.Client(conf.uri, conf.clientId || conf.username + '-' + clientIdSuff, );
  }

  console.log('TRYING TO CONNECT TO MQTT! (2)', mqttClient.isConnected())

  const onMessageArrived = (msg) => {
    // console.log('Message received!',msg)
    // console.log(subscribedTopicCallback)

    let topic = msg._getDestinationName()
    let message = msg._getPayloadString()
    if (!subscribedTopicCallback[topic]) {
      var wildCardTopic = ''
      var tempTopic = topic
      while (topic) {
        if (topic.indexOf('/') !== -1) {
          topic = topic.substring(0, topic.lastIndexOf('/')) + '/#'
        } else {
          topic = '#'
        }
        if (subscribedTopicCallback[topic]) {
          wildCardTopic = topic
          break
        }
        if (topic.indexOf('/') !== -1) {
          topic = topic.replace('/#', '')
        } else {
          topic = ''
        }
      }

      if (topic) {
        Object.keys(subscribedTopicCallback[topic]).forEach(function (key) {
          subscribedTopicCallback[topic][key](topic, message)
          console.log('Callback called (1)')
        })
      } else {
      }
    } else {
      Object.keys(subscribedTopicCallback[topic]).forEach(function (key) {
        // console.log('Calling the callback ', subscribedTopicCallback[topic][key], topic, key, message, subscribedTopicCallback[topic][key].id)
        try {
          message = JSON.parse(message)
        } catch (ex) { }

        subscribedTopicCallback[topic][key](topic, message)
        console.log('Callback called (2)')
      })
    }
  }

  const onConnectionLost = (err) => {
    if (err.errorCode) {
      console.log(mqttClient.isConnected(), 'connectionLost', err)
    }
  }

  mqttClient.onConnectionLost = onConnectionLost;
  mqttClient.onMessageArrived = onMessageArrived;
  mqttClient.connect({
    onSuccess: afterConnect,
    useSSL: true,
    userName: conf.username,
    password: conf.password,
    cleanSession: false,
    reconnect: true
  });
}

function subscribe(componentId, topic, callback, qos) {
  enqueue({
    type: 'SUB',
    componentId,
    topic,
    callback
  })
}

function sub(componentId, topic, callback, qos) {
  if (mqttClient === null) {
    return
  }
  if (!mqttClient.isConnected()) {
    throw Error('mqtt client not ready!')
  }

  //to support calling without component id
  if (typeof topic === 'function') {
    componentId = DEFAULT_COMPONENT_ID
    topic = componentId
    callback = topic
    qos = callback
  }

  callback.id = componentId
  subscribedTopicCallback[topic] = subscribedTopicCallback[topic] ? subscribedTopicCallback[topic] : {}
  subscribedTopicCallback[topic][componentId] = callback

  return new Promise((resolve, reject) =>
    mqttClient.subscribe(topic,
      {
        onSuccess: () => {
          resolve()
        }, onFailure: () => {
          reject()
        },
        qos: qos || 0
      })
  )
}

function unsubscribe(componentId, topic) {
  enqueue({
    type: 'UNSUB',
    componentId,
    topic
  })
}

function unsub(componentId, topic) {
  if (mqttClient === null) {
    return
  }
  if (!mqttClient.isConnected()) {
    console.warn('mqtt client not ready!')
    // throw Error('mqtt client not ready!')
  }

  //to support calling without component id
  var args = Array.from(arguments)
  if (args.length == 1) {
    componentId = DEFAULT_COMPONENT_ID
    topic = componentId
  }

  if (!subscribedTopicCallback[topic]) { return true }

  delete subscribedTopicCallback[topic][componentId]

  if (Object.keys(subscribedTopicCallback[topic]).length === 0) {

    return new Promise((resolve, reject) =>
      mqttClient.unsubscribe(topic,
        {
          onSuccess: () => {
            resolve()
          }, onFailure: () => {
            reject()
          }
        }
      ))

  }
}

function publish(componentId, topic, message, qos, retained) {
  enqueue({
    type: 'PUB',
    componentId,
    topic,
    message,
    qos,
    retained
  })
}

function pub(componentId, topic, message, qos, retained) {
  if (mqttClient === null) {
    return
  }
  if (!mqttClient.isConnected()) {
    console.warn('mqtt client not ready!')
    return
  }

  //to support calling without component id
  if (typeof componentId === 'string'
    && (typeof topic === 'string' || typeof message === 'object')
    && (!message || typeof message === 'number')
  ) {
    componentId = DEFAULT_COMPONENT_ID
    topic = componentId
    message = topic
    qos = message
    retained = qos
  }

  if (typeof message === 'object') {
    message = JSON.stringify(message)
  }

  const msg = new Paho.MQTT.Message(message)
  msg.destinationName = topic
  msg.qos = qos || 0
  msg.retained = retained ? true : false
  mqttClient.send(msg)
}

function disconnect(afterDisconnect) {
  if (!mqttClient || !mqttClient.isConnected()) {
    afterDisconnect(Error('Not connected'))
    console.error('Not connected')
    return
  }
  const _subscribedTopicCallback = subscribedTopicCallback

  console.log('Checking if any unsubscription is pending. Pending count: ' + Object.keys(_subscribedTopicCallback).length)
  Promise.all(Object.keys(subscribedTopicCallback).reduce((old, topic) => {
    var unsubs = Object.keys(subscribedTopicCallback[topic]).map((compId) => {
      return unsub(compId, topic)
    })
    return old.concat(unsubs)
  }, []))
    .then(ar => {
      mqttClient.disconnect()
      setTimeout(afterDisconnect, 300)
      // mqttClient = null // Dont reuse Paho.Client Instance
    })
}

export default {
  enqueue,
  connect,
  subscribe,
  unsubscribe,
  publish,
  disconnect
}
