"use strict";
//React Modules
import React from "react";
import {Button, View, ScrollView, Text, DeviceEventEmitter, StyleSheet, TouchableNativeFeedback} from "react-native";
import {createStackNavigator} from "react-navigation";
//Installed modules
import RNLibMuse from "rn-libmuse";
//Local modules
import ArticleScreen from "./ArticleScreen";
import {eeg_observable} from "./eeg.js";

const EPOCH_SIZE = 256; //Number of samples in an epoch
const EPOCH_INTERVAL = 100; //ms between emitted epochs

RNLibMuse.Init();
RNLibMuse.setBufferSize(64);
DeviceEventEmitter.addListener("OnMuseListChanged", (muses) => {
	if (muses.length > 0)
	{
		RNLibMuse.connect(muses[0]);
	}
});

const eeg_stream = eeg_observable(EPOCH_SIZE, EPOCH_INTERVAL);
eeg_stream.subscribe(eeg_packet => {
	console.log(eeg_packet);
});

const styles = StyleSheet.create({
	button:
	{
		flex: 1,
		backgroundColor: "blue"
	},
	buttonText:
	{
		color: "white",
		textAlign: "center"
	}

});

class MenuScreen extends React.Component
{
	render()
	{
		const odyssesyText = require("./odyssesy");
/*			<View>
				<Button title="Read the Odyssesy" onPress={()=>this.props.navigation.navigate("Odyssesy", {text : odyssesyText})}/>
			</View>*/
		return (
			<View style={{flex: 1}}>
			<TouchableNativeFeedback  onPress={()=>this.props.navigation.navigate("Odyssesy", {text: odyssesyText})}>
				<View style={{flex:1, backgroundColor:"red"}}>
					<Text style={styles.buttonText}>Read the Odyssesy</Text>
				</View>
			</TouchableNativeFeedback>
				<TouchableNativeFeedback  onPress={()=>RNLibMuse.search()}>
					<View style={{flex:2, backgroundColor:"blue"}}>
						<Text style={styles.buttonText}>Search/Refresh</Text>
					</View>
				</TouchableNativeFeedback>
			</View>
		);
	}
}

const App = createStackNavigator(
	{
		Menu: {screen: MenuScreen},
		Odyssesy: {screen: ArticleScreen}
	},
	{
		initialRouteName: "Menu"
	}
);

export default App;
