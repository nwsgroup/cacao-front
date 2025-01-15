import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

export default function App() {
  const [status, setStatus] = useState('Loading model...');
  const [imageUri, setImageUri] = useState(null);
  const [prediction, setPrediction] = useState(null);

  // Load the model
  const loadModel = async () => {
    try {
      const classifier = await pipeline('image-classification', 'Factral/test25');
      setStatus('Ready');
      return classifier;
    } catch (error) {
      console.error('Error loading model:', error);
      setStatus('Failed to load model');
    }
  };

  const [classifier, setClassifier] = useState(null);

  React.useEffect(() => {
    (async () => {
      const loadedClassifier = await loadModel();
      setClassifier(() => loadedClassifier);
    })();
  }, []);

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: true, // Ensures the image is returned as a base64 string
      });

      console.log('Image picker result:', result);
      console.log('Assets:', result.assets);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setPrediction(null);
        if (classifier) {
          await analyzeImage(asset.base64); 
        } else {
          setStatus('Model not loaded yet');
        }
      } else {
        setStatus('Image selection canceled or invalid');
      }
    } catch (error) {
      console.error('Error during image selection:', error);
      setStatus('Failed to select image');
    }
  };

  const analyzeImage = async (base64) => {
    try {
      setStatus('Analyzing...');
      const dataUri = `data:image/jpeg;base64,${base64}`;
      const output = await classifier(dataUri, { topk: 1 });
      setStatus('');
      setPrediction(output[0]);
    } catch (error) {
      console.error('Error analyzing image:', error);
      setStatus('Analysis failed');
    }
  };

  const resetImage = () => {
    setImageUri(null);
    setPrediction(null);
    setStatus('Ready');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
      ) : (
        <Text>No image selected</Text>
      )}

      {prediction && (
        <Text style={styles.prediction}>
          Prediction: {prediction.label} {'\n'} Probability: {prediction.score}
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={handleImagePick}>
        <Text style={styles.buttonText}>Upload Image</Text>
      </TouchableOpacity>

      {imageUri && (
        <TouchableOpacity style={styles.button} onPress={resetImage}>
          <Text style={styles.buttonText}>Reset Image</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  status: {
    marginBottom: 20,
    fontSize: 16,
  },
  image: {
    width: 300,
    height: 300,
    marginBottom: 20,
    borderRadius: 10,
    borderColor: '#CCC',
    borderWidth: 1,
  },
  prediction: {
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
  },
});
