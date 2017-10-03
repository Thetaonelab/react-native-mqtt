import React from 'react'
import { subscribe, unsubscribe } from './MqttEssential'

export default function connectMqttStore(WrappedComponent, stores) {
  class Wrapper extends React.Component {
    constructor(props) {
      super(props)
      this.state = {}
      var me = require('./MqttEssential').default
      this.subscribe = me.subscribe
      this.unsubscribe = me.unsubscribe
      this.publish = me.publish
      this.disconnect = me.disconnect
      this.addTopicToStore = this.addTopicToStore.bind(this)
      this.removeTopicFromStore = this.removeTopicFromStore.bind(this)
      this.removeAllTopicFromStore = this.removeAllTopicFromStore.bind(this)
      this.sendMessage = this.sendMessage.bind(this)
      this._addTopic = this._addTopic.bind(this)
      this._storeSelectCallbacks = {}
      this._storeTopic = {}
      this.componentId = 'cid-' + parseInt(Math.random() * 10000)
      this.enqueue = me.enqueue
    }

    componentWillMount() {
      stores.forEach(function (st) {
        if (!st.selectData) {
          st.selectData = (dt) => ({ ...dt })
        }
        this.setState({ [st.storeName]: st.defaultValue ? st.defaultValue() : {} })
        this._storeSelectCallbacks[st.storeName] = st.selectData
        this._storeTopic[st.storeName] = []
      }, this)
    }

    componentDidMount() {
      stores.forEach(function (st) {
        if (st.defaultTopic) {
          this._addTopic(st.storeName, st.defaultTopic, st.selectData)
        }
      }, this)
    }

    _addTopic(store, topic, select) {
      if (this._storeTopic[store].indexOf(topic) === -1) {
        this._storeTopic[store].push(topic)
      } else {
      // TODO: need review, can unsubscribe be gaurded?
      // return
      }
      this.unsubscribe(this.componentId, topic)

      this.subscribe(this.componentId, topic, function (_topic, message) {
        var parsed = {}

        if (typeof message === 'object') {
          parsed = message
        } else {
          try {
            parsed = JSON.parse(message)
          } catch (ex) {
            parsed = { data: message }
          }
        }
        let dt = {}
        dt[store] = { ...this.state[store], ...parsed }
        this.setState({ [store]: select(dt[store]) })
      }.bind(this))
    }

    componentWillUnmount() {
      stores.forEach(function (st) {
        this.removeAllTopicFromStore(st.storeName)
      }, this)

      this._storeSelectCallbacks = {}
      this._storeTopic = {}
      // this.disconnect();
    }

    addTopicToStore(storeName, newTopic) {
      console.log('New topic added', newTopic)
      this._addTopic(storeName, newTopic, this._storeSelectCallbacks[storeName])
    }

    removeTopicFromStore(storeName, topic) {
      if (this._storeTopic[storeName].indexOf(topic) !== -1) {
        var index = this._storeTopic[storeName].indexOf(topic)
        if (index > -1) {
          this._storeTopic[storeName].splice(index, 1)
        }
        this.unsubscribe(this.componentId, topic)
      }
    }

    removeAllTopicFromStore(storeName) {
      console.log('All Topics removed!')
      this._storeTopic[storeName].forEach(function (st) {
        this.unsubscribe(this.componentId, st)
      }, this)
      this._storeTopic[storeName] = []
    }

    sendMessage(topic, message, qos, retained) {
      console.log('Sending message', topic, message)
      this.publish(this.componentId, topic, message)
    }
    render() {
      return <WrappedComponent
        {...this.props}
        {...this.state}
        addTopicToStore={this.addTopicToStore}
        removeTopicFromStore={this.removeTopicFromStore}
        removeAllTopicFromStore={this.removeAllTopicFromStore}
        sendMessage={this.sendMessage} />
    }
  }
  Wrapper.displayName = `MqttStoreConnectWrapper(${getDisplayName(WrappedComponent)})`
  return Wrapper
}

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component'
}
