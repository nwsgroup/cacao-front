import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pipeline, env } from '@xenova/transformers';
import tw from 'twrnc';


env.allowLocalModels = false;

export default function App() {
  const [status, setStatus] = useState('Loading model...');
  const [imageUri, setImageUri] = useState(null);
  const [prediction, setPrediction] = useState(null);

  // Load the model
  const loadModel = async () => {
    try {
      const classifier = await pipeline('image-classification', 'CristianR8/test-detection',{
        quantized: true
      });
      console.log('Model loaded successfully');
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
        base64: true, 
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
    <View style={tw`flex-1 justify-center items-center p-5 bg-gray-100`}>
      <Text style={tw`mb-5 text-lg font-semibold text-gray-800`}>{status}</Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={tw`w-72 h-72 mb-5 rounded-lg border border-gray-300 shadow-lg`} resizeMode="contain" />
      ) : (
        <Text style={tw`text-center text-gray-500`}>No image selected</Text>
      )}

      {prediction && (
        <View style={tw`mb-5 bg-white p-4 rounded-lg shadow-md w-72`}>
          <Text style={tw`text-center text-gray-800 font-medium`}>Prediction: {prediction.label}</Text>
          <Text style={tw`text-center text-gray-600 mt-1`}>Probability: {prediction.score}</Text>
        </View>
      )}

      <TouchableOpacity style={tw`bg-blue-500 mt-4 px-4 py-2 rounded-lg shadow-lg w-72 text-center hover:bg-blue-600`} onPress={handleImagePick}>
        <Text style={tw`text-white text-lg font-medium`}>Upload Image</Text>
      </TouchableOpacity>

      {imageUri && (
        <TouchableOpacity style={tw`bg-red-500 px-4 py-2 rounded-lg shadow-lg w-72 text-center mt-4 hover:bg-red-600`} onPress={resetImage}>
          <Text style={tw`text-white text-lg font-medium`}>Reset Image</Text>
        </TouchableOpacity>
      )}
    </View> 
  );
}
