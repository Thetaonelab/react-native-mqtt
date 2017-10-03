import React, { PureComponent } from 'react'

import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TextInput,
  Button,
  Platform
} from 'react-native'

import { MqttEssential, connectMqttStore } from 'react-native-mqtt'

var ToastAndroid
if (Platform.OS === 'android') {
  ToastAndroid = require('react-native').ToastAndroid;
}

class MqttViewer extends PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      input: ''
    }
  }

  handleInputChange = text => {
    this.setState({ input: text })
  }

  handlePress = () => {
    ToastAndroid && ToastAndroid.showWithGravity(`PUBLISHING: ${this.state.input}`, ToastAndroid.SHORT, ToastAndroid.BOTTOM)
    this.props.sendMessage('/react_mqtt_demo/text', this.state.input)
  }

  render() {
    const {
      addTopicToStore,
      removeTopicFromStore,
      removeAllTopicFromStore,
      sendMessage,
      ...props
    } = this.props

    return (

      <View style={styles.demo}>
        <Text style={styles.header}>mqtt topic: /react_mqtt_demo/text</Text>
        <Text style={{ textAlign: "center", marginTop: 20, marginBottom: 5 }}>Type some text to publish to mqtt</Text>
        <TextInput
          value={this.state.input}
          placeholder="Type some text"
          onChangeText={this.handleInputChange}
          style={{ height: 50, backgroundColor: "#e2e2e2", marginBottom: 20, padding: 5 }}
        />
        <Button
          title="Publish"
          color="#6978C0"
          onPress={this.handlePress}
          style={{ marginBottom: 40 }}
        />
        <View style={{ marginTop: 20 }}>
          <Text style={styles.header}>Values from MQTT</Text>
          <Text>
            {JSON.stringify(props, 2, null)}
          </Text>
        </View>
      </View>

    )
  }
}


MqttViewer.displayName = 'MqttViewer'

const ConnectedMqttViewer = connectMqttStore(MqttViewer, [{
  storeName: 'message',
  defaultTopic: '/react_mqtt_demo/text'
}])

const { width, height, fontScale, scale } = Dimensions.get('window')

class App extends PureComponent {

  componentWillMount() {
    MqttEssential.connect({
      uri: 'wss://test.mosquitto.org:8081/'
    }, () => {
      ToastAndroid && ToastAndroid.show('Connected to mqtt server', ToastAndroid.SHORT)
    })
  }



  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          React Native Mqtt Demo
        </Text>
        <ConnectedMqttViewer />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
  welcome: {
    fontSize: 28,
    textAlign: 'center',
    margin: 10,
    marginTop: 50,
    justifyContent: 'flex-start'
  },
  header: {
    fontSize: 18,
    fontWeight: "200",
    marginBottom: 10
  },
  demo: {
    marginTop: 16//Math.floor(height * 0.2)
  }
})

export default App


