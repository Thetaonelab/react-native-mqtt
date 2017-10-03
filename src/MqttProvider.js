import { Component} from 'react'
import PropTypes from 'prop-types'

class MqttProvider extends Component {
//   constructor (props) {
//       super(props)
//     }

  getChildContext () {
    return { lbsConnect: this.props.lbsConnect }
  }

  render () {
    return this.props.children
  }
}

MqttProvider.childContextTypes = { lbsConnect: PropTypes.func }
export default MqttProvider
