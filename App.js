import React, { useState, useEffect } from 'react';
import { View, Text, Button, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { pipeline, env } from '@fugood/transformers';

// Set up environment
env.allowLocalModels = false;

export default function App() {
  const [status, setStatus] = useState('Loading model...');
  const [imageUri, setImageUri] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  // Load the model and check permissions
  const [classifier, setClassifier] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        // Check and request permissions
        const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setHasPermission(mediaLibraryPermission.status === 'granted');
        
        // Load the model
        const model = await pipeline('image-classification', 'Factral/test25');
        setClassifier(model);
        setStatus('Ready');
      } catch (error) {
        console.error('Error during initialization:', error);
        setStatus('Error initializing app');
      }
    })();
  }, []);

  // Function to handle image picking
  const pickImage = async () => {
    if (!hasPermission) {
      setStatus('Permission denied');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        // Ensure we have a local file URI
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          setImageUri(uri);
          await classifyImage(uri);
        } else {
          throw new Error('Selected image file does not exist');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setStatus('Error selecting image');
    }
  };

  // Function to classify the image
  const classifyImage = async (uri) => {
    if (!classifier) {
      setStatus('Model not ready');
      return;
    }

    setIsLoading(true);
    setStatus('Analyzing image...');

    try {
      // For Android, we might need to prepend 'file://' to the URI
      const processedUri = Platform.OS === 'android' ? 'file://' + uri : uri;
      
      const result = await classifier(processedUri, { 
        topk: 1,
        // Add any additional model-specific parameters here
      });

      setPrediction(`Prediction: ${result[0].label} | Confidence: ${(result[0].score * 100).toFixed(2)}%`);
      setStatus('Analysis complete');
    } catch (error) {
      console.error('Error classifying image:', error);
      setStatus('Error analyzing image');
      setPrediction(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset image and state
  const resetImage = () => {
    setImageUri(null);
    setPrediction(null);
    setStatus('Ready');
  };

  // If permissions haven't been checked yet
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Checking permissions...</Text>
      </View>
    );
  }

  // If permissions were denied
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to media library. Please enable permissions in your device settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      {imageUri && (
        <Image 
          source={{ uri: imageUri }} 
          style={styles.image}
          onError={(error) => {
            console.error('Error loading image:', error);
            setStatus('Error loading image');
            resetImage();
          }}
        />
      )}
      {!imageUri && (
        <TouchableOpacity 
          onPress={pickImage} 
          style={styles.uploadButton}
          disabled={isLoading}
        >
          <Text style={styles.uploadText}>Upload Image</Text>
        </TouchableOpacity>
      )}
      {isLoading && <ActivityIndicator size="large" color="#0000ff" />}
      {prediction && <Text style={styles.prediction}>{prediction}</Text>}
      {imageUri && (
        <Button 
          title="Reset" 
          onPress={resetImage}
          disabled={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  status: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  image: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  uploadButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
  },
  uploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  prediction: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    width: '100%',
  },
});