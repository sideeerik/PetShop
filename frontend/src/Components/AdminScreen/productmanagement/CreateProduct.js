import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';
import {
  createProduct,
  fetchSuppliers,
  clearError,
  clearSuccess,
} from '../../../redux/slices/productSlice';

const CreateProductContent = React.memo(({ 
  formData, 
  setFormData, 
  images, 
  setImages, 
  loading, 
  suppliers, 
  showCategoryModal, 
  setShowCategoryModal, 
  showSupplierModal, 
  setShowSupplierModal,
  handleSubmit,
  pickImage,
  removeImage,
  navigation
}) => {
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const getSelectedSupplierName = useCallback(() => {
    if (!formData.supplier) return 'No Supplier';
    const supplier = suppliers.find(s => s._id === formData.supplier);
    return supplier ? supplier.name : 'No Supplier';
  }, [formData.supplier, suppliers]);

  const categories = [
    'Pet Food',
    'Pet Accessories',
    'Pet Toys',
    'Health & Wellness',
    'Grooming Supplies',
    'Feeding Supplies',
    'Housing & Cages',
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#7A4B2A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Create Product</Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="inventory-2" size={18} color="#7A4B2A" />
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => handleInputChange('name', text)}
          placeholder="Enter product name"
        />

        <Text style={styles.label}>Price *</Text>
        <TextInput
          style={styles.input}
          value={formData.price}
          onChangeText={(text) => handleInputChange('price', text)}
          placeholder="Enter price"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => handleInputChange('description', text)}
          placeholder="Enter product description"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Category *</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={formData.category ? styles.pickerTextSelected : styles.pickerText}>
            {formData.category || 'Select a category'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>

        <Text style={styles.label}>Supplier (Optional)</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowSupplierModal(true)}
        >
          <Text style={formData.supplier ? styles.pickerTextSelected : styles.pickerText}>
            {getSelectedSupplierName()}
          </Text>
          <Icon name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>

        <Text style={styles.label}>Stock *</Text>
        <TextInput
          style={styles.input}
          value={formData.stock}
          onChangeText={(text) => handleInputChange('stock', text)}
          placeholder="Enter stock quantity"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Images * (Max 5)</Text>
        
        <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
          <Icon name="add-a-photo" size={24} color="#3498db" />
          <Text style={styles.imageUploadText}>Upload Images</Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <View style={styles.imageSection}>
            <FlatList
              horizontal
              data={images}
              keyExtractor={(item, index) => `image-${index}`}
              renderItem={({ item, index }) => (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: item.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Icon name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.imageList}
            />
            <Text style={styles.imageCount}>
              Total: {images.length}/5 images
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Product</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    formData.category === item && styles.categoryItemSelected,
                  ]}
                  onPress={() => {
                    handleInputChange('category', item);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[
                    styles.categoryText,
                    formData.category === item && styles.categoryTextSelected,
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Supplier Modal */}
      <Modal
        visible={showSupplierModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSupplierModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Select Supplier</Text>
            
            <TouchableOpacity
              style={[
                styles.supplierItem,
                !formData.supplier && styles.supplierItemSelected,
              ]}
              onPress={() => {
                handleInputChange('supplier', '');
                setShowSupplierModal(false);
              }}
            >
              <Text style={[
                styles.supplierText,
                !formData.supplier && styles.supplierTextSelected,
              ]}>
                No Supplier
              </Text>
            </TouchableOpacity>

            {suppliers.length === 0 ? (
              <View style={styles.emptySuppliers}>
                <Text style={styles.emptySuppliersText}>
                  No suppliers available. Please add suppliers first.
                </Text>
              </View>
            ) : (
              <FlatList
                data={suppliers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.supplierItem,
                      formData.supplier === item._id && styles.supplierItemSelected,
                    ]}
                    onPress={() => {
                      handleInputChange('supplier', item._id);
                      setShowSupplierModal(false);
                    }}
                  >
                    <View style={styles.supplierInfo}>
                      <Text style={[
                        styles.supplierText,
                        formData.supplier === item._id && styles.supplierTextSelected,
                      ]}>
                        {item.name}
                      </Text>
                      {item.email && (
                        <Text style={[
                          styles.supplierEmail,
                          formData.supplier === item._id && styles.supplierEmailSelected,
                        ]}>
                          {item.email}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSupplierModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
});

export default function CreateProductScreen({ navigation }) {
  const dispatch = useDispatch();
  const { suppliers, loading, error, success } = useSelector(
    (state) => state.products
  );
  
  const [images, setImages] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    supplier: '',
    stock: '',
  });

  useEffect(() => {
    dispatch(fetchSuppliers());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
    if (success) {
      Alert.alert(
        'Success',
        'Product created successfully',
        [{ text: 'OK', onPress: () => navigation.navigate('ProductList') }]
      );
      dispatch(clearSuccess());
    }
  }, [error, success, dispatch, navigation]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uploadedImages = result.assets.map(asset => ({
        uri: asset.uri,
        type: 'image/jpeg',
        name: `product_${Date.now()}.jpg`,
      }));
      
      const totalImages = images.length + uploadedImages.length;
      if (totalImages > 5) {
        Alert.alert('Limit Exceeded', 'Maximum 5 images allowed');
        return;
      }
      setImages([...images, ...uploadedImages]);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert('Validation Error', 'Valid price is required');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return false;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      Alert.alert('Validation Error', 'Valid stock quantity is required');
      return false;
    }
    if (images.length === 0) {
      Alert.alert('Validation Error', 'At least one image is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const formDataToSend = new FormData();
    
    formDataToSend.append('name', formData.name.trim());
    formDataToSend.append('price', parseFloat(formData.price));
    formDataToSend.append('description', formData.description.trim());
    formDataToSend.append('category', formData.category);
    formDataToSend.append('stock', parseInt(formData.stock));
    
    if (formData.supplier && formData.supplier !== '') {
      formDataToSend.append('supplier', formData.supplier);
    }

    images.forEach((image, index) => {
      const fileUri = image.uri;
      const fileName = image.name || `product_${Date.now()}_${index}.jpg`;
      
      formDataToSend.append('images', {
        uri: fileUri,
        type: 'image/jpeg',
        name: fileName,
      });
    });

    dispatch(createProduct(formDataToSend));
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            const { logout } = await import('../../../utils/helper');
            await logout();
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <AdminDrawer onLogout={handleLogout}>
      <CreateProductContent
        formData={formData}
        setFormData={setFormData}
        images={images}
        setImages={setImages}
        loading={loading}
        suppliers={suppliers}
        showCategoryModal={showCategoryModal}
        setShowCategoryModal={setShowCategoryModal}
        showSupplierModal={showSupplierModal}
        setShowSupplierModal={setShowSupplierModal}
        handleSubmit={handleSubmit}
        pickImage={pickImage}
        removeImage={removeImage}
        navigation={navigation}
      />
    </AdminDrawer>
  );
}

// Keep all your existing styles
const styles = StyleSheet.create({
  // ... all your existing styles from the original file
  container: {
    flex: 1,
    backgroundColor: '#F6EDE3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FDF7F1',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D6C3',
  },
  backButtonHeader: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8D6C3',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 14,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A87B54',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    margin: 16,
    padding: 22,
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7D8C8',
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
    color: '#5C3B28',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDC8B5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 15,
    fontSize: 16,
    color: '#3E2A1F',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDC8B5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: '#999',
  },
  pickerTextSelected: {
    fontSize: 16,
    color: '#3E2A1F',
  },
  imageSection: {
    marginBottom: 15,
  },
  imageUploadButton: {
    backgroundColor: '#FFF8F2',
    borderWidth: 2,
    borderColor: '#B88B65',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  imageUploadText: {
    color: '#8B5E3C',
    marginTop: 5,
    fontWeight: '800',
  },
  imageList: {
    paddingVertical: 10,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 10,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#C95E52',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCount: {
    fontSize: 12,
    color: '#7C6555',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  cancelButton: {
    backgroundColor: '#EEE2D6',
    padding: 15,
    borderRadius: 16,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7B99A',
  },
  cancelButtonText: {
    color: '#7A4B2A',
    fontWeight: '800',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#8B5E3C',
    padding: 15,
    borderRadius: 16,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
    textAlign: 'center',
    color: '#3E2A1F',
  },
  categoryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryItemSelected: {
    backgroundColor: '#8B5E3C',
  },
  categoryText: {
    fontSize: 16,
    color: '#3E2A1F',
  },
  categoryTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  supplierItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  supplierItemSelected: {
    backgroundColor: '#8B5E3C',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierText: {
    fontSize: 16,
    color: '#3E2A1F',
    fontWeight: '500',
  },
  supplierTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  supplierEmail: {
    fontSize: 12,
    color: '#7C6555',
    marginTop: 2,
  },
  supplierEmailSelected: {
    color: '#e0e0e0',
  },
  emptySuppliers: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySuppliersText: {
    fontSize: 14,
    color: '#8E7665',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalCloseButton: {
    backgroundColor: '#EEE2D6',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseText: {
    color: '#7A4B2A',
    fontWeight: '800',
    fontSize: 16,
  },
});
