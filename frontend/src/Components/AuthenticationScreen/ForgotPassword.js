import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fix URL for Android emulator
  const getBackendUrl = () => {
    if (Platform.OS === 'android') {
      return BACKEND_URL.replace('localhost', '10.0.2.2');
    }
    return BACKEND_URL;
  };

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    // Correct URL: backend URL + route
    const url = `${getBackendUrl()}/api/v1/users/forgot-password`;
    console.log('Forgot password URL:', url);

    try {
      const response = await axios.post(url, { email });
      console.log('Forgot password response:', response.data);

      if (response.data.success) {
        setMessage(response.data.message || 'Password reset email sent successfully.');
      } else {
        setError(response.data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your email address to reset your password.</Text>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        placeholder="Your Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <Button
        title={loading ? 'Sending...' : 'Send Reset Email'}
        onPress={handleSubmit}
        disabled={loading}
      />

      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}

      <Text style={styles.back} onPress={() => navigation.goBack()}>
        ← Back to Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 20, textAlign: 'center', color: '#555' },
  input: { marginBottom: 15, borderWidth: 1, padding: 12, borderRadius: 8, borderColor: '#ccc' },
  success: { color: 'green', textAlign: 'center', marginBottom: 10 },
  error: { color: 'red', textAlign: 'center', marginBottom: 10 },
  back: { color: 'blue', textAlign: 'center', marginTop: 20 },
});