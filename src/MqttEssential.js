import { Message, Client } from 'react-native-paho-mqtt'

var pubsubQueue = []

function enqueue (obj) {
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

var subscribedTopicCallback = {}
var mqttClient
var saveConf


function connect(conf, afterConnect) {

  console.log('TRYING TO CONNECT TO MQTT! (1)', mqttClient ? mqttClient._client.connected : null)
  if (mqttClient && mqttClient._client.connected) {
    console.log('MQTT ALREADY CONNECTED!')
    return
  }

  saveConf = conf

  if (!mqttClient)
    mqttClient = new Client({
      uri: conf.uri,
      clientId: conf.username + '-' + Math.random().toString(16).substr(2, 18),
      storage: conf.storage || myStorage,
      webSocket: conf.webSocket
    })

  console.log('TRYING TO CONNECT TO MQTT! (2)', mqttClient._client.connected)
  mqttClient.connect({ userName: conf.username, password: conf.password })
    .then(() => {
      if (afterConnect) {
        afterConnect()
      }
    })
    .catch(console.error)


  //// MESSAGE RECEIVER HANDLER
  mqttClient.on('messageReceived', function (msg) {
    let topic = msg._destinationName
    let message = msg.payloadString
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
      })
    }
  })
  //// MESSAGE RECEIVER HANDLER END

  //// CLIENT ERROR HANDLER
  mqttClient.on('connectionLost', (err) => {
    if (err.errorCode) { // Only when unexpected connection lost happens
      console.log(mqttClient._client.connected, 'connectionLost', err)
      connect(saveConf)
    }
  })


}

function subscribe(componentId, topic, callback) {
  enqueue({
    type: 'SUB',
    componentId,
    topic,
    callback
  })
}

function sub(componentId, topic, callback) {
  if (!mqttClient || !mqttClient._client.connected) {
    console.warn('mqtt client not ready!')
    throw Error('mqtt client not ready!')
  }

  callback.id = componentId
  subscribedTopicCallback[topic] = subscribedTopicCallback[topic] ? subscribedTopicCallback[topic] : {}
  subscribedTopicCallback[topic][componentId] = callback

  return mqttClient.subscribe(topic)
    .then(() => {
      // console.log('Subscribed to ', topic)
      return true
    })
    .catch(er => {
      throw er
    })
}

function unsubscribe(componentId, topic) {
  enqueue({
    type: 'UNSUB',
    componentId,
    topic
  })
}
function unsub(componentId, topic) {
  if (!mqttClient || !mqttClient._client.connected) {
    console.warn('mqtt client not ready!')
    throw Error('mqtt client not ready!')
  }

  if (!subscribedTopicCallback[topic]) { return true }

  delete subscribedTopicCallback[topic][componentId]
  if (Object.keys(subscribedTopicCallback[topic]).length === 0) {
    return mqttClient.unsubscribe(topic)
      .then(() => {
        delete subscribedTopicCallback[topic]
        console.log('Unsubscribed', topic)
        return true
      })
      .catch(er => {
        throw er
      })
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
  if (!mqttClient || !mqttClient._client.connected) {
    console.warn('mqtt client not ready!')
    return
  }

  if (typeof message === 'object') {
    message = JSON.stringify(message)
  }

  const msg = new Message(message)
  msg.destinationName = topic
  msg.qos = qos || 0
  msg.retained = retained ? true : false
  mqttClient.send(msg)
}


function disconnect(afterDisconnect) {
  if (!mqttClient || !mqttClient._client.connected) {
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
        .then(() => {
          if (afterDisconnect) {
            afterDisconnect()
          }
          console.log('MQTT Disconnected!')
        })
        .catch(console.log)
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
