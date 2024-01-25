package com.geolocalisation_nearby;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;

import org.json.JSONException;
import org.json.JSONObject;


public class GeolocalisationNearby extends ReactContextBaseJavaModule {
    private String _did;
    private double _longitude;
    private double _latitude;

    GeolocalisationNearby(ReactApplicationContext context) {
        super(context);
    }

    private static final Strategy STRATEGY = Strategy.P2P_STAR;
    private static final String SERVICE_ID =
            "com.blockchain.geolocalisation.nearby";

    @NonNull
    @Override
    public String getName(){
        return "GeolocalisationNearby";
    }


    @ReactMethod
    public void setLoc(double lg, double lat){
        _longitude = lg;
        _latitude = lat;
    };

    private boolean isDiscovering = false;

    @ReactMethod
    public void startAdvertising(String did) {
        this._did = did;
        Log.d("startAdvertising", "Start");

        AdvertisingOptions advertisingOptions =
                new AdvertisingOptions.Builder().setStrategy(STRATEGY).build();

        Nearby.getConnectionsClient(getReactApplicationContext())
                .startAdvertising(
                        _did, SERVICE_ID, connectionLifecycleCallback, advertisingOptions)
                .addOnSuccessListener(
                        (Void unused) -> {
                            Log.d("startAdvertising", "Success");
                        })
                .addOnFailureListener(
                        (Exception e) -> {
                            Log.d("startAdvertising", "Fail");
                            Log.d("error", String.valueOf(e));
                        });
    }
    @ReactMethod
    public void stopAdvertising() {
        Log.d("stopAdvertising", "Start");
        Nearby.getConnectionsClient(getReactApplicationContext())
                .stopAdvertising();
        Nearby.getConnectionsClient(getReactApplicationContext())
                .stopAllEndpoints();
    }
    
    @ReactMethod
    public void startDiscovery(String did) {
        this._did = did;
        this.isDiscovering = true;
        Log.d("startDiscovery", "Start");
        DiscoveryOptions discoveryOptions =
                new DiscoveryOptions.Builder().setStrategy(STRATEGY).build();
        Nearby.getConnectionsClient(getReactApplicationContext())
                .startDiscovery(SERVICE_ID, endpointDiscoveryCallback, discoveryOptions)
                .addOnSuccessListener(
                        (Void unused) -> {
                            Log.d("startDiscovery", "Success");
                        })
                .addOnFailureListener(
                        (Exception e) -> {
                            Log.d("startDiscovery", "Fail");
                            Log.d("error", String.valueOf(e));
                        });
    }

    @ReactMethod
    public void stopDiscovery() {
        this.isDiscovering = false;
        Log.d("stopDiscovery", "Start");
        Nearby.getConnectionsClient(getReactApplicationContext())
                .stopDiscovery();
        Nearby.getConnectionsClient(getReactApplicationContext())
                .stopAllEndpoints();
    }

    private final ConnectionLifecycleCallback connectionLifecycleCallback =
            new ConnectionLifecycleCallback() {
                @Override
                public void onConnectionInitiated(@NonNull String endpointId, @NonNull ConnectionInfo connectionInfo) {
                    // Automatically accept the connection on both sides.
                    Log.d("ConnectionInitiated", "ok");
                    ReceiveBytesPayloadListener payloadCallback = new ReceiveBytesPayloadListener();
                    Nearby.getConnectionsClient(getReactApplicationContext()).acceptConnection(endpointId, payloadCallback );
                }

                @Override
                public void onConnectionResult(@NonNull String endpointId, ConnectionResolution result) {
                    switch (result.getStatus().getStatusCode()) {
                        case ConnectionsStatusCodes.STATUS_OK -> {
                            // Retrieve coordinates
                            Log.d("connection", "ok");
                            if (isDiscovering) {
                                JSONObject coords = new JSONObject();
                                try {
                                    coords.put("longitude", _longitude);
                                    coords.put("latitude", _latitude);
                                } catch (JSONException e) {
                                    throw new RuntimeException(e);
                                }
                                Payload bytesPayload = Payload.fromBytes(coords.toString().getBytes());
                                Nearby.getConnectionsClient(getReactApplicationContext()).sendPayload(endpointId, bytesPayload);
                                Log.d("payloadSent", "ok");
                            }
                        }
                        case ConnectionsStatusCodes.STATUS_CONNECTION_REJECTED ->
                            // The connection was rejected by one or both sides.
                                Log.d("connection", "rejected");
                        case ConnectionsStatusCodes.STATUS_ERROR ->
                            // The connection broke before it was able to be accepted.
                                Log.d("connection", "error");
                        default -> {
                        }
                        // Unknown status code
                    }
                }

                @Override
                public void onDisconnected(@NonNull String endpointId) {
                    // We've been disconnected from this endpoint. No more data can be
                    // sent or received.
                    Log.d("connection", "lost");
                }
            };

    private final EndpointDiscoveryCallback endpointDiscoveryCallback =
            new EndpointDiscoveryCallback() {
                @Override
                public void onEndpointFound(@NonNull String endpointId, @NonNull DiscoveredEndpointInfo info) {
                    // An endpoint was found. We request a connection to it.
                    Nearby.getConnectionsClient(getReactApplicationContext())
                            .requestConnection(_did, endpointId, connectionLifecycleCallback)
                            .addOnSuccessListener(
                                    (Void unused) -> {
                                        // We successfully requested a connection. Now both sides
                                        // must accept before the connection is established.
                                        Log.d("endpointCallback", "ok");
                                    })
                            .addOnFailureListener(
                                    (Exception e) -> {
                                        // Nearby Connections failed to request the connection.
                                        Log.d("endpointCallback", String.valueOf(e));
                                    });
                }

                @Override
                public void onEndpointLost(@NonNull String endpointId) {
                    // A previously discovered endpoint has gone away.
                }
            };
    class ReceiveBytesPayloadListener extends PayloadCallback {
        @Override
        public void onPayloadReceived(@NonNull String endpointId, Payload payload) {
            // This always gets the full data of the payload. Is null if it's not a BYTES payload.
            if (payload.getType() == Payload.Type.BYTES) {
                byte[] receivedBytes = payload.asBytes();
                String message = new String(receivedBytes);

                try{
                    getReactApplicationContext()
                            .getJSModule(RCTNativeAppEventEmitter.class)
                            .emit("deviceFound", message);
                    Log.d("payloadReceived", "ok");
                }catch (Exception e){
                    Log.d("payloadNotSent", String.valueOf(e));
                }
            }
        }

        @Override
        public void onPayloadTransferUpdate(@NonNull String endpointId, PayloadTransferUpdate update) {
            // Bytes payloads are sent as a single chunk, so you'll receive a SUCCESS update immediately
            // after the call to onPayloadReceived().
            if (update.getStatus() == PayloadTransferUpdate.Status.SUCCESS)
                Log.d("payloadUpdate", "ok");
            else if (update.getStatus() == PayloadTransferUpdate.Status.FAILURE) {
                Log.d("payloadUpdate", "fail");
            }
        }

    }

    // Required for rn built in EventEmitter Calls.
    @ReactMethod
    public void addListener(String eventName) {

    }

    @ReactMethod
    public void removeListeners(Integer count) {

    }



}


