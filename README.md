# react-native-mqtt

A react-native HOC for for mqtt using react-native-paho-mqtt

## Getting Started

#### Installation

`yarn add @eyezon/react-native-mqtt`

It adds _react-native-paho-mqtt_ as its dependencies.

Some component that you want to recieve message from mqtt as props
```jsx
// Temparature.js
import React, { PureComponent } from 'react'
import { connectMqttStore } from 'react-native-mqtt'

class Temparature extends PureComponent {
    render () {
        return (
            <div className="tempView">
                {this.props.temp} °C
            </div>
        )
    }
}

export default connectMqttStore(Temparature, [{
    storeName: 'temp',
    defaultTopic: 'path/to/topic/'
}])

// In some file connect to mqtt

MqttEssential.connect({
    uri: 'ws://mqtturl.com/',
    username: 'usernameformqtt',
    password: 'passwordforuser'
}, () => {
    //OnConnectCallback
})
```

`connectMqttStore` takes A Component and and array of objects, which desceibes the mqtt path and the prop name of that data. The objects may also contains a selector, simmilar to react-redux's.
If you specify a selector in key **`selectData`** it will be called with mqtt's JSON.parsed messege or string of JSON.parsed fails.
Wrapped component will get the return object/value from `selectdata` as props.
A identity function is used if `selectData` is not provided.

## API

_TODO_

## Contribution

