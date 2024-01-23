import React, {useState} from 'react';
import {NativeModules, Button, PermissionsAndroid} from 'react-native';
import { StyleSheet,View,Text } from 'react-native';
import Geolocation from 'react-native-geolocation-service'
import { DeviceEventEmitter } from 'react-native';

const { GeolocalisationNearby } = NativeModules

const App = () => {
  PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
  ).then((result)=>
    {
      if (result)
        console.log("Vous pouvez utiliser la géolocalisation.")
      else
        console.log("Vous ne pouvez pas utiliser la géolocalisation.")
    })
  
  const [location, setLocation] = useState(false);

  const onPressAdvertising =  () => {
    let countNearbyDevices=0;
    GeolocalisationNearby.startAdvertising("did:peaq:123");

    // Récupération des coordonnées d'au plus 3 :
    DeviceEventEmitter.addListener("deviceFound", (msg) => { 
        if (countNearbyDevices <= 3) {
          console.log(msg)
          countNearbyDevices++}
        })
    };

  const onPressStopAd = () => {
    GeolocalisationNearby.stopAdvertising();
  }

  const onPressDiscovering = () => {
    // On détecte la géolocalisation puis on envoie au serveur pour le mettre dans un smart contract
    Geolocation.getCurrentPosition(
      position => {
        console.log(position);
        setLocation(position);
        // envoie au serveur pour le mettre dans le smart contract
        sendRequest(position);
        // enregistrement dans nearby
        GeolocalisationNearby.setLoc(position.coords.longitude, position.coords.latitude);
      },
      error => {
        console.log(error.code, error.message);
        setLocation(false);
      },
    
      {enableHighAccuracy: true, timeout: 30000, maximumAge: 10000},
    )

    // Découverte
    GeolocalisationNearby.startDiscovery("did:peaq:456");
  };

  const onPressStopDiscovering = () => {
    GeolocalisationNearby.stopDiscovery();
  };

  return (
  <>
  <View style={styles.space} />
  <Text style={styles.text}>Activer le wifi (pas besoin d'être connecté à Internet), la localisation, le bluetooth et le partage à proximité pour que Nearby fonctionne. Si vous êtes un utilisateur, utilisez l'advertising pour signaler votre présence</Text>
  <View style={styles.button}>
    <Button
    title="Advertising"
    color="#841584"
    onPress={onPressAdvertising}/>  
    <View style={styles.space} />
    <Button
    title="Stop Advertising"
    color="#841584"
    onPress={onPressStopAd}/>
  </View>
  <View style={styles.space} />
  <Text style={styles.text}>Si votre appareil joue le rôle d\'une antenne, utilisez plutôt la découverte et lasser la localisation activé</Text>
  <View style={styles.button}>
    <Button
    title="Discovering"
    color="#841584"
    onPress={onPressDiscovering}/>  
    <View style={styles.space} />
    <Button
    title="Stop Discovery"
    color="#841584"
    onPress={onPressStopDiscovering}/>
  </View>
    </>
  );
};


const styles = StyleSheet.create({
  button:{
    padding:30,
    justifyContent: 'center',
    alignContent:'center',
  },
  text:{
    padding:30,
    justifyContent: 'center',
    alignContent:'center'
  },
  space:{
    width:20,
    height:20
  }
})

const sendRequest = async (position: any) => { 
  // Envoie vers le serveur pour l'écriture du smart contract
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    "longitude": position.coords.longitude,
    "latitude": position.coords.latitude
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  fetch("http://192.168.1.31:8000/geolocation" , requestOptions)
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error))
    ;
}

export default App;