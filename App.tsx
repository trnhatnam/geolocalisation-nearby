import React, {useState, useEffect} from 'react';
import {NativeModules, Button, PermissionsAndroid} from 'react-native';
import { StyleSheet,View,Text } from 'react-native';
import Geolocation from 'react-native-geolocation-service'
import { NativeEventEmitter } from 'react-native';

const geolib = require('geolib') // je suis obligé d'importer comme ça sinon ça renvoie un objet undefined
const { GeolocalisationNearby } = NativeModules
const eventEmitter = new NativeEventEmitter(GeolocalisationNearby);

const App = () => {
  PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES]
  ).then((result)=>
    {
      if (result)
        console.log("Permissions OK")
      else
      {
        PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES]
        )
      }
    })

  // état de l'appareil
  const did = "did:peaq:123";
  const [state, setState] = useState("Déconnecté");

  const onPressAdvertising =  () => {
    setState("Advertising");
    GeolocalisationNearby.startAdvertising(did);
  }

  // ---- stockage des localisations des appareils à proximité pour la publicité -----
  // appareils à proximité
  const [locationArray, updateLocationArray] = useState<Array<{"longitude":number,"latitude":number}>>([]);
  // localisation à partir des appareils à proximité
  const [location, setLocation] = useState<{"longitude":number,"latitude":number}|null>(null);
  
  // dés que le programme reçoit un event deviceFound, on ajoute la localisation dans la liste des appareils à proximité
  useEffect(() => {
      const subscription = eventEmitter.addListener("deviceFound", (msg) => {
      const jsonData = JSON.parse(msg);
      console.log("eventEmitter");
      console.log(jsonData);
      updateLocationArray(prevLocationArray => {
         const newLocationArray = [...prevLocationArray, jsonData];
         const newLocation = geolib.getCenterOfBounds(newLocationArray);
         setLocation(newLocation);
         if (newLocationArray.length == 3){
          sendRequest(did, newLocation);

         }
         return newLocationArray;
      });
      ;}
    )
    return () => subscription.remove();
      }
    ,[])

  
  // les boutons
  const onPressStopAd = () => {
      setState("Déconnecté");
      GeolocalisationNearby.stopAdvertising();
      updateLocationArray(prevLocationArray => []);
    }

  const onPressDiscovering = () => {
    setState("Discovering");
    // On détecte la géolocalisation puis on envoie au serveur pour le mettre dans un smart contract
    Geolocation.getCurrentPosition(
        position => {
          // envoie au serveur pour le mettre dans le smart contract
          sendRequest(did,position);
          // enregistrement dans nearby
          GeolocalisationNearby.setLoc(position.coords.longitude, position.coords.latitude);
        },
        error => {
          console.log(error.code, error.message);
        },
      
        {enableHighAccuracy: true, timeout: 30000, maximumAge: 10000})
    // Découverte
    GeolocalisationNearby.startDiscovery(did);
  };

  const onPressStopDiscovering = () => {
    setState("Déconnecté");
    GeolocalisationNearby.stopDiscovery();
  };

  return (
  <>
  <View style={styles.space} />
  <Text style={styles.text}>Activer le wifi (pas besoin d'être connecté à Internet), la localisation, le bluetooth pour que Nearby fonctionne. Si vous êtes un utilisateur, utilisez l'advertising pour signaler votre présence</Text>
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
    <Text style={styles.text}>Longitude : {location ? location.longitude : "..."}</Text>
    <Text style={styles.text}>Latitude : {location ? location.latitude : "..."}</Text>
  <View style={styles.space} />
  <View style={styles.button}>
    <Button
    title="Discovering"
    color="#841584"
    onPress={onPressDiscovering}/>  
    <View style={styles.space} />
    <Button
    title="Stop Discovering"
    color="#841584"
    onPress={onPressStopDiscovering}/>
  </View>
  <Text style={styles.text}>Etat : {state}</Text>
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

const sendRequest = async (did: String, position: any) => { 
  // Envoie vers le serveur pour l'écriture du smart contract
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    "did":did,
    "longitude": position.coords.longitude,
    "latitude": position.coords.latitude
  });

  fetch("http://192.168.1.31:8000/geolocation" , 
  {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  })
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error))
    ;
}

export default App;
