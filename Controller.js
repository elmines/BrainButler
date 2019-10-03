//@flow
import {DeviceEventEmitter} from "react-native";
import SystemSetting from "react-native-system-setting";

import Config, {edfHeader} from "./Config";
import BBSocket from "./BBSocket";
import {eegObservable} from "./Streaming";


export default class Controller {
  constructor() {
		this.eegBuffer = [];
		this.subscriptions = [];
		this.callbackIds = [];

		this.socket = Controller._openSocket();

		this.subscriptions.push( eegObservable.subscribe((packet) => {
			this.eegBuffer.push(packet);
			if (Config.sampleFrequency <= this.eegBuffer.length)
			{
				this.socket.send(JSON.stringify({type: "data", body: this.eegBuffer}));
				this.eegBuffer = [];
			}
		}));

  } //End constructor

  destructor() {
		this.subscriptions.forEach(subscription => subscription.unsubscribe());
		this.subscriptions = [];
		this.callbackIds.forEach(callbackId => clearInterval(callbackId));
		this.callbackIds = [];
    this.socket.send(JSON.stringify({type: "eof"}));

		this.socket.close();
  }

  sendMathForm() {
    console.log("Sending a math form");
    const payload = {
      type: "form",
      form: {
        title: "Math Problem",
        categories: ["Text"],
        fields: [
          {name: "solution", label: "Solution"}
        ],
      }
    };
    this.socket.send(JSON.stringify(payload));
  }
  sendPromptForm() {
    console.log("Sending a prompt form");
    const payload = {
      type: "form",
      form: {
        title: "Strategy",
        categories: ["Choice"],
        fields: [
          {
            name: "strategy",
            labels: ["Fact Retrieval", "Procedure Use", "Other"],
            values: ["factRetrieval", "procedureUse", "other"],
            exclusive: true
          }
        ]
      }
    }
    this.socket.send(JSON.stringify(payload));
  }

  static _openSocket() {
    const socket = BBSocket.getInstance();

    const openFunc = () => {
        var headerData = edfHeader();
      headerData.labels.push("brightness");
      headerData.sampleFrequency.push(0);
      headerData.prefilter.push("None");
      headerData.physicalDimension.push("None");
			socket.send(JSON.stringify({type: "header", ...headerData}));

			SystemSetting.getAppBrightness().then((curr) => {
        const brightness = "full"; //FIXME: Derive this from `curr`
				socket.send(JSON.stringify({
					type: "event", name: "brightness",
          value: brightness, timestamp: Date.now()
				}));
			});
		}

    socket.open(openFunc);

    return socket;
  }

  /*
   * Record an arbitrary event
  */
  recordEvent(packet) {
    this.socket.send(JSON.stringify(packet));
  }

  brightenScreen() {
    this._changeBrightness(Config.brightness.full, "full")
  }

  darkenScreen() {
      this._changeBrightness(Config.brightness.low, "low")
  }

  _darkenScreen() {this.darkenScreen();}

  _changeBrightness(num, str) {
			SystemSetting.getAppBrightness().then((curr) => {
        if (Math.abs(num - curr) > 0.001) {
					this.socket.send(JSON.stringify({
            type: "event", name: "brightness",
            timestamp: Date.now(), value: num
					}));
  			  SystemSetting.setAppBrightness(num);
        }
			});
  }

} //End Controller class
