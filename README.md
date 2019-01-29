# react-native-mqtt

<img src="logo.png" width="150px" alt="logo">

A react-native **Higher Order Component** for exchanging realtime mqtt messages as props. 

## Installation

`npm install @eyezon/react-native-mqtt`

OR

`yarn add @eyezon/react-native-mqtt`

## Getting Started

```
import { MqttClient } from '@eyezon/react-native-mqtt'

const secureUri = 'wss://iot.eclipse.org:443/ws';
// const username = 'optional_user'; 
// const password = 'optional_pass';

const clientId = Math.floor(Math.random() * 1000) + '';  // protocol_name is  name need to connect to the mqtt server

MqttClient.connect({ 
    secureUri, 
    // username, 
    // password, 
    clientId },()=>{
  console.log('Woo! Mqtt connected!!')
});
```

## Using the Higher Order Component
```
import React, { Component } from 'react';
import { connectMqttStore } from '@eyezon/react-native-mqtt';

class YourCoolComponent extends Component {
    // coming back to this later
}

let mqttStores = [
  {
    storeName: "MyRealtimeStore", // components will receive the storeName as the prop which contains all the data sent by the mqtt server
    defaultTopic: "/eyezon/looks/cool",
    select: (data)=>{ commentCount: data.commentCount }
  },
  {
      ... multiple stores
  }
];

export default connectMqttStore(
  YourCoolComponent,
  mqttStores
)

```
The select property is optional and expects a redux like mapStateToProps function. In the above example, the commentCount can be accessed by `this.props.MyRealtimeStore.commentCount`

defaultTopic is also optional. Use this if you expect your component will always be subscribed to this topic.

*P.S:* It tries to parse the incoming message to JSON and pass the JSON to both props & `select` function.

```

class YourCoolComponent extends Component {
    constructor(props){
        super(props)
        this.intervalId = null
    }
    componentDidMount(){
        this.props.addTopicToStore('/eyezon/looks/cool') // automatically removes the added store as the component unmounts

        this.intervalId = setInterval(()=>{
            this.props.send('/eyezon/looks/cool',{commentCount: Math.random()})
        },2000)
    }

    componentWillUnmount(){
        this.props.removeTopicFromStore('/eyezon/looks/cool')
        this.intervalId && clearInterval(this.intervalId)
    }

    render(){
        return <View> 
            <Text>{this.props.MyRealtimeStore.commentCount}</Text>
        </View>
    }
}

```
## API
- **HOC API**
_Passed as props to the wrapped component_

1. `addTopicToStore(storeName,topicString [,qos])`
2. `removeTopicFromStore(storeName,topicString)`
3. `removeAllTopicsFromStore(storeName)`
4. `send(topicString[,qos,retainFlag])`

- **RAW API**

1. `MqttClient.subscribe(topicString,[,qos])`
2. `MqttClient.unsubscribe(topicString)`
3. `MqttClient.sendMessage(topicString,messageJson[,qos,retainFlag])`
4. `MqttClient.connect(conf,afterConnectCallback)`
5. `MqttClient.disconnect(afterDisconnectCallback)`

## Contribution

