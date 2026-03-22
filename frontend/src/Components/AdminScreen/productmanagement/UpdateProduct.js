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
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  fetchProductById,
  updateProduct,
  fetchSuppliers,
  clearError,
  clearSuccess,
  clearCurrentProduct,
} from '../../../redux/slices/productSlice';

const UpdateProductContent = React.memo(({
  formData,
  setFormData,
  existingImages,
  setExistingImages,
  newImages,
  setNewImages,
  loading,
  suppliers,
  showCategoryModal,
  setShowCategoryModal,
  showSupplierModal,
  setShowSupplierModal,
  showDiscountSection,
  setShowDiscountSection,
  showStartDatePicker,
  setShowStartDatePicker,
  showEndDatePicker,
  setShowEndDatePicker,
  handleSubmit,
  pickImage,
  removeExistingImage,
  removeNewImage,
  navigation,
  calculateDiscountedPrice,
  calculateDiscountPercentage
}) => {
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleDiscountPercentageChange = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    handleInputChange('discountPercentage', cleaned);
    
    if (formData.price && cleaned) {
      const calculatedPrice = calculateDiscountedPrice(formData.price, cleaned);
      handleInputChange('discountedPrice', calculatedPrice);
    } else {
      handleInputChange('discountedPrice', '');
    }
  };

  const handleDiscountedPriceChange = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    handleInputChange('discountedPrice', cleaned);
    
    if (formData.price && cleaned) {
      const original = parseFloat(formData.price);
      const discounted = parseFloat(cleaned);
      if (original > 0 && discounted > 0 && discounted < original) {
        const percentage = ((original - discounted) / original * 100).toFixed(1);
        handleInputChange('discountPercentage', percentage);
      }
    }
  };

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

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, discountStartDate: selectedDate }));
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, discountEndDate: selectedDate }));
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#7A4B2A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Update Product</Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="edit" size={18} color="#7A4B2A" />
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

        <Text style={styles.label}>Supplier</Text>
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

        {/* Discount/Promotion Section */}
        <View style={styles.discountHeader}>
          <Text style={styles.sectionTitle}>Discount / Promotion</Text>
          <Switch
            value={showDiscountSection}
            onValueChange={setShowDiscountSection}
            trackColor={{ false: '#ddd', true: '#3498db' }}
            thumbColor={showDiscountSection ? '#fff' : '#f4f3f4'}
          />
        </View>

        {showDiscountSection && (
          <View style={styles.discountSection}>
            <Text style={styles.label}>Discount Percentage (%)</Text>
            <TextInput
              style={styles.input}
              value={formData.discountPercentage}
              onChangeText={handleDiscountPercentageChange}
              placeholder="Enter discount percentage (e.g., 10 for 10%)"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Discounted Price (₱)</Text>
            <View style={styles.calculatedPriceContainer}>
              <TextInput
                style={[styles.input, styles.calculatedInput]}
                value={formData.discountedPrice}
                onChangeText={handleDiscountedPriceChange}
                placeholder="Auto-calculated or enter manually"
                keyboardType="decimal-pad"
              />
              {formData.price && formData.discountedPrice && (
                <Text style={styles.savingsText}>
                  Save: ₱{(parseFloat(formData.price) - parseFloat(formData.discountedPrice)).toFixed(2)}
                </Text>
              )}
            </View>

            <Text style={styles.label}>Discount Start Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={formData.discountStartDate ? styles.dateText : styles.datePlaceholder}>
                {formatDate(formData.discountStartDate)}
              </Text>
              <Icon name="calendar-today" size={20} color="#666" />
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={formData.discountStartDate || new Date()}
                mode="date"
                display="default"
                onChange={onStartDateChange}
                minimumDate={new Date()}
              />
            )}

            <Text style={styles.label}>Discount End Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={formData.discountEndDate ? styles.dateText : styles.datePlaceholder}>
                {formatDate(formData.discountEndDate)}
              </Text>
              <Icon name="calendar-today" size={20} color="#666" />
            </TouchableOpacity>

            {showEndDatePicker && (
              <DateTimePicker
                value={formData.discountEndDate || new Date()}
                mode="date"
                display="default"
                onChange={onEndDateChange}
                minimumDate={formData.discountStartDate || new Date()}
              />
            )}

            {formData.discountStartDate && formData.discountEndDate && 
             formData.discountStartDate > formData.discountEndDate && (
              <Text style={styles.errorText}>
                End date must be after start date
              </Text>
            )}
          </View>
        )}

        <Text style={styles.label}>Images * (Max 5 total)</Text>
        
        {existingImages.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionSubtitle}>Current Images</Text>
            <FlatList
              horizontal
              data={existingImages}
              keyExtractor={(item, index) => `existing-${index}`}
              renderItem={({ item, index }) => (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: item.url }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeExistingImage(index)}
                  >
                    <Icon name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.imageList}
            />
          </View>
        )}

        <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
          <Icon name="add-a-photo" size={24} color="#3498db" />
          <Text style={styles.imageUploadText}>Add More Images</Text>
        </TouchableOpacity>

        {newImages.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionSubtitle}>New Images</Text>
            <FlatList
              horizontal
              data={newImages}
              keyExtractor={(item, index) => `new-${index}`}
              renderItem={({ item, index }) => (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: item.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeNewImage(index)}
                  >
                    <Icon name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.imageList}
            />
          </View>
        )}

        <Text style={styles.imageCount}>
          Total: {existingImages.length + newImages.length}/5 images
        </Text>

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
              <Text style={styles.submitButtonText}>Update Product</Text>
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

export default function UpdateProductScreen({ navigation, route }) {
  const { productId } = route.params;
  const dispatch = useDispatch();
  const { currentProduct, suppliers, loading, error, success } = useSelector(
    (state) => state.products
  );
  
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showDiscountSection, setShowDiscountSection] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    supplier: '',
    stock: '',
    discountedPrice: '',
    discountPercentage: '',
    discountStartDate: null,
    discountEndDate: null,
  });

  useEffect(() => {
    dispatch(fetchProductById(productId));
    dispatch(fetchSuppliers());
    
    return () => {
      dispatch(clearCurrentProduct());
    };
  }, [dispatch, productId]);

  useEffect(() => {
    if (currentProduct) {
      setFormData({
        name: currentProduct.name || '',
        price: currentProduct.price?.toString() || '',
        description: currentProduct.description || '',
        category: currentProduct.category || '',
        supplier: currentProduct.supplier?._id || '',
        stock: currentProduct.stock?.toString() || '',
        discountedPrice: currentProduct.discountedPrice?.toString() || '',
        discountPercentage: currentProduct.discountPercentage?.toString() || '',
        discountStartDate: currentProduct.discountStartDate ? new Date(currentProduct.discountStartDate) : null,
        discountEndDate: currentProduct.discountEndDate ? new Date(currentProduct.discountEndDate) : null,
      });
      setExistingImages(currentProduct.images || []);
      
      if (currentProduct.discountedPrice || currentProduct.discountPercentage) {
        setShowDiscountSection(true);
      }
    }
  }, [currentProduct]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
    if (success) {
      Alert.alert(
        'Success',
        'Product updated successfully',
        [{
          text: 'OK',
          onPress: () => {
            dispatch(clearCurrentProduct());
            navigation.reset({
              index: 0,
              routes: [{ name: 'ProductList' }],
            });
          },
        }]
      );
      dispatch(clearSuccess());
    }
  }, [error, success, dispatch, navigation]);

  const calculateDiscountedPrice = (price, percentage) => {
    if (!price || !percentage) return '';
    const discount = (parseFloat(price) * parseFloat(percentage)) / 100;
    return (parseFloat(price) - discount).toFixed(2);
  };

  const calculateDiscountPercentage = (price, discountedPrice) => {
    if (!price || !discountedPrice) return '';
    const original = parseFloat(price);
    const discounted = parseFloat(discountedPrice);
    if (original > 0 && discounted > 0 && discounted < original) {
      return ((original - discounted) / original * 100).toFixed(1);
    }
    return '';
  };

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
      const totalImages = existingImages.length + newImages.length + uploadedImages.length;
      if (totalImages > 5) {
        Alert.alert('Limit Exceeded', 'Maximum 5 images total allowed');
        return;
      }
      setNewImages([...newImages, ...uploadedImages]);
    }
  };

  const removeExistingImage = (index) => {
    const newExistingImages = [...existingImages];
    newExistingImages.splice(index, 1);
    setExistingImages(newExistingImages);
  };

  const removeNewImage = (index) => {
    const newImagesList = [...newImages];
    newImagesList.splice(index, 1);
    setNewImages(newImagesList);
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
    if (existingImages.length + newImages.length === 0) {
      Alert.alert('Validation Error', 'At least one image is required');
      return false;
    }

    if (showDiscountSection) {
      if (formData.discountedPrice && parseFloat(formData.discountedPrice) >= parseFloat(formData.price)) {
        Alert.alert('Validation Error', 'Discounted price must be less than original price');
        return false;
      }
      
      if (formData.discountPercentage && 
          (parseFloat(formData.discountPercentage) < 0 || parseFloat(formData.discountPercentage) > 100)) {
        Alert.alert('Validation Error', 'Discount percentage must be between 0 and 100');
        return false;
      }

      if (formData.discountStartDate && formData.discountEndDate && 
          formData.discountStartDate > formData.discountEndDate) {
        Alert.alert('Validation Error', 'End date must be after start date');
        return false;
      }
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
    
    if (showDiscountSection) {
      if (formData.discountedPrice) {
        formDataToSend.append('discountedPrice', parseFloat(formData.discountedPrice));
      }
      if (formData.discountPercentage) {
        formDataToSend.append('discountPercentage', parseFloat(formData.discountPercentage));
      }
      if (formData.discountStartDate) {
        formDataToSend.append('discountStartDate', formData.discountStartDate.toISOString());
      }
      if (formData.discountEndDate) {
        formDataToSend.append('discountEndDate', formData.discountEndDate.toISOString());
      }
    } else {
      formDataToSend.append('discountedPrice', '');
      formDataToSend.append('discountPercentage', '');
      formDataToSend.append('discountStartDate', '');
      formDataToSend.append('discountEndDate', '');
    }
    
    if (formData.supplier && formData.supplier !== '') {
      formDataToSend.append('supplier', formData.supplier);
    } else {
      formDataToSend.append('supplier', '');
    }

    if (existingImages.length > 0) {
      formDataToSend.append('existingImages', JSON.stringify(existingImages));
    }

    newImages.forEach((image, index) => {
      const fileUri = image.uri;
      const fileName = image.name || `product_${Date.now()}_${index}.jpg`;
      
      formDataToSend.append('images', {
        uri: fileUri,
        type: 'image/jpeg',
        name: fileName,
      });
    });

    dispatch(updateProduct({ productId, formData: formDataToSend }));
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

  if (loading && !currentProduct) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <UpdateProductContent
        formData={formData}
        setFormData={setFormData}
        existingImages={existingImages}
        setExistingImages={setExistingImages}
        newImages={newImages}
        setNewImages={setNewImages}
        loading={loading}
        suppliers={suppliers}
        showCategoryModal={showCategoryModal}
        setShowCategoryModal={setShowCategoryModal}
        showSupplierModal={showSupplierModal}
        setShowSupplierModal={setShowSupplierModal}
        showDiscountSection={showDiscountSection}
        setShowDiscountSection={setShowDiscountSection}
        showStartDatePicker={showStartDatePicker}
        setShowStartDatePicker={setShowStartDatePicker}
        showEndDatePicker={showEndDatePicker}
        setShowEndDatePicker={setShowEndDatePicker}
        handleSubmit={handleSubmit}
        pickImage={pickImage}
        removeExistingImage={removeExistingImage}
        removeNewImage={removeNewImage}
        navigation={navigation}
        calculateDiscountedPrice={calculateDiscountedPrice}
        calculateDiscountPercentage={calculateDiscountPercentage}
      />
    </AdminDrawer>
  );
}

// Keep all your existing styles
const styles = StyleSheet.create({
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D6C3',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  discountSection: {
    backgroundColor: '#F5E7D7',
    padding: 15,
    borderRadius: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5CBAF',
  },
  calculatedPriceContainer: {
    marginBottom: 15,
  },
  calculatedInput: {
    marginBottom: 5,
  },
  savingsText: {
    fontSize: 12,
    color: '#7C9A66',
    marginTop: 2,
    marginBottom: 10,
  },
  datePickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDC8B5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#3E2A1F',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  errorText: {
    color: '#C95E52',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
  },
  imageSection: {
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#7C6555',
    marginBottom: 5,
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
