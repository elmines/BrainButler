//@flow
import React from "react";
import {View, Text, StyleSheet, DeviceEventEmitter} from "react-native";
import {TouchableNativeFeedback} from "react-native";
import {MuseDeviceManager} from "react-native-muse";
import {bandpassFilter, epoch} from "@neurosity/pipes";
import type {Observable} from "rxjs";

import AppConfig from "./props.json";

type Props = {};
type State = {playing: boolean, finished: boolean, equation: string};

export default class GameScreen extends React.Component<Props, State>
{
  //state: equation
  static PROB_WRONG: number = 0.5; //0.3; //Probability of showing an incorrect equation
  static MAX_OPERAND: number = 9;
  static MIN_ERROR: number = 20;
  static MAX_ERROR: number = 30;

  static MAX_TRIALS: number = 20;
  static INTERVAL: number = 1000 //Interval between equations in ms

  static BUFFER_SIZE: number = 256;

  callbackIds: Array<number>;
  trialCount: number;
  manager: MuseDeviceManager;
  correct: boolean;
  dataObservable: Observable;

  constructor(props)
  {
    super(props);
    this.state = {playing: false, finished: false, equation: "Error"};
    this.callbackIds = [];
    this.buffer = [];
    this.manager = MuseDeviceManager.getInstance();
    this.trialCount = 0;

    this.server_uri = `ws://${AppConfig.ip}:${AppConfig.port}`;
    this.ws = new WebSocket(this.server_uri);
    this.ws.onopen = () => {
      console.log(`Connection to brain-butler-server opened at ${this.server_uri}`);
    };

    ///*
    this.ws.send(JSON.stringify({
        type: "header",
        body: {
          labels: ["EEG1", "EEG2", "EEG3", "EEG4", "ErrorStimulusPresent"]
        }
    })); //*/

    this.dataObservable = this.manager.data().pipe(
        bandpassFilter({
          nbChannels: this.manager.getChannelNames().length,
          cutoffFrequencies: [1, 30]}),
    );

    this.startGame = () =>
    {
      this.currEpoch = [];
      this.trialCount = 0;
      this.displayEquation();

      const callbackID: number = setInterval((): void => {
        if (this.trialCount >= GameScreen.MAX_TRIALS)
        {
          this.setState((prev: State): State => {
            return {playing:false, finished:true, equation: ""};
          });
        }
        else this.displayEquation();
      }, GameScreen.INTERVAL);
      this.callbackIds.push(callbackID);

      this.dataSubscription = this.dataObservable.subscribe((packet) => {
      this.sendDataPacket(packet);
      });
    }; //End this.startGame
  }//End constructor

  sendDataPacket(packet) {
    const data = packet.data.concat(this.correct ? 0 : 1);
    this.buffer.push(data);
    if (this.buffer.length >= GameScreen.BUFFER_SIZE) {
      this.ws.send(JSON.stringify( {type: "data", body: this.buffer} ));
      this.buffer = [];
    }
  }

  render()
  {
    if (this.state.finished) return this.finishedScreen();
    if (!this.state.playing) return this.instructionsScreen();

    const flexPadding = styles.equation.flex;
    return (
      <View style={{flex: 1}}>
        <View style={{flex: flexPadding}}></View>
        <View style={styles.equation}>
          <Text style={styles.equationText}>{this.state.equation}</Text>
        </View>
        <View style={{flex: flexPadding}}></View>
      </View>
    );
  }

  instructionsScreen()
  {
    return (
      <View style={{flex:1}}>
        <View style={{flex:1}}></View>
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              For each equation, say whether it is right or wrong.
            </Text>
          </View>
        <View style={{flex:1}}></View>
        <ChoiceButton text="OK" onPress={this.startGame}/>
      </View>
    );
  }

  finishedScreen()
  {
    return (
      <View style={{flex:1}}>
        <View style={{flex:1}}></View>
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>You have finished the game!</Text>
        </View>
        <View style={{flex:1}}></View>
      </View>
    );
  }

  displayEquation(): void
  {
    ++this.trialCount;
    const right: boolean = Math.random() >= GameScreen.PROB_WRONG;
    const equation: string = GameScreen.genEquation(right);
    this.correct = right; //Don't change the `correct` flag too early
    this.setState((prev: State): State => {
      return {playing:true, finished:false, equation};
    });
  }

  static genEquation(correct: boolean = true): string
  {
    const a: number = Math.ceil(Math.random() * GameScreen.MAX_OPERAND);
    const b: number = Math.ceil(Math.random() * GameScreen.MAX_OPERAND);
    var sum: number = a + b;
    if (!correct){
      const error: number = GameScreen.MIN_ERROR +
        Math.floor(Math.random() * (GameScreen.MAX_ERROR+1-GameScreen.MIN_ERROR));
      const sign: number = (Math.random() <= 0.5) ? 1 : -1;
      sum += error;
    }
    return a + " + " + b + " = " + sum;
  }

  componentWillUnmount()
  {
    this.callbackIds.forEach(callbackId => clearInterval(callbackId));
    if (this.dataSubscription) this.dataSubscription.unsubscribe();

    this.ws.send(JSON.stringify({type: "eof"}));
    console.log(`Closing connection to brain-butler-server at ${this.server_uri}`);
    this.ws.close();

  }
}

class ChoiceButton extends React.Component
{
  //Props: onPress, backgroundColor, text
  render()
  {
    return (
      <TouchableNativeFeedback onPress={this.props.onPress}>
        <View style={styles.choiceButton}>
          <View style={{flex:1}}></View>
          <Text style={styles.choiceText}>{this.props.text}</Text>
          <View style={{flex:1}}></View>
        </View>
      </TouchableNativeFeedback>
    );
  }
}

const styles = StyleSheet.create({
  instructions:
  {
    flex: 1,
  },
  instructionsText:
  {
    fontSize: 40,
    textAlign: "center"
  },
  equation:
  {
    flex: 1,
  },
  equationText:
  {
    fontSize: 60,
    fontWeight: "bold",
    textAlign: "center"
  },
  choiceButton:
  {
    flex: 1,
    backgroundColor: "blue",
  },
  choiceText:
  {
    textAlign: "center",
    color: "white",
    fontSize: 60
  },
});
