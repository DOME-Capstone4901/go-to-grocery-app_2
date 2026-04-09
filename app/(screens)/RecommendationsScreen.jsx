import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

import { router } from 'expo-router';
const RecommendationsScreen = () => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAddToCart = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleViewCart = () => {
    if (selectedItems.length > 0) {
      // Navigate to Login screen when cart button is clicked
      router.push('/(screens)/LoginScreen');
    }
  };

  const recommendations = [
    {
      id: 1,
      name: 'Organic Whole Wheat Bread',
      brand: "Nature's Best",
      rating: 'A',
      score: 92,
      improvement: '+35%',
      icon: '🍞',
      reason: 'Higher fiber, no preservatives',
      price: '$4.99',
      savings: 'Save $1.50',
      distance: '0.5 mi',
      store: 'Whole Foods',
      nutrients: {
        fiber: 'High',
        sugar: 'Low',
        protein: 'Good'
      }
    },
    {
      id: 2,
      name: 'Greek Yogurt - Low Fat',
      brand: 'Fresh Farms',
      rating: 'A',
      score: 88,
      improvement: '+28%',
      icon: '🥛',
      reason: 'More protein, less sugar',
      price: '$3.49',
      savings: 'Save $0.80',
      distance: '1.2 mi',
      store: 'Trader Joe\'s',
      nutrients: {
        protein: 'High',
        sugar: 'Low',
        calcium: 'Excellent'
      }
    },
    {
      id: 3,
      name: 'Extra Virgin Olive Oil',
      brand: 'Mediterranean Gold',
      rating: 'A+',
      score: 95,
      improvement: '+42%',
      icon: '🫒',
      reason: 'Cold-pressed, heart healthy',
      price: '$12.99',
      savings: 'Save $3.00',
      distance: '2.1 mi',
      store: 'Costco',
      nutrients: {
        fat: 'Healthy',
        antioxidants: 'High',
        cholesterol: 'None'
      }
    },
    {
      id: 4,
      name: 'Dark Chocolate 85%',
      brand: 'Cocoa Pure',
      rating: 'B+',
      score: 78,
      improvement: '+25%',
      icon: '🍫',
      reason: 'Less sugar, antioxidants',
      price: '$5.49',
      savings: 'Save $1.00',
      distance: '0.8 mi',
      store: 'Target',
      nutrients: {
        sugar: 'Low',
        antioxidants: 'High',
        iron: 'Good'
      }
    },
  ];

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'A+': return '#27AE60';
      case 'A': return '#2ECC71';
      case 'B+': return '#F39C12';
      case 'B': return '#E74C3C';
      default: return '#95A5A6';
    }
  };

  const renderNutrientBadge = (label, value, index) => (
    <View key={`nutrient-${label}-${index}`} style={styles.nutrientBadge}>
      <Text style={styles.nutrientLabel}>{label}</Text>
      <Text style={styles.nutrientValue}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#2C3E50" />
          <Text style={styles.backText}>Scan</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.appName}>To Go Grocery</Text>
          <Text style={styles.headerSubtitle}>Healthier Alternatives</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.cartIcon}
          onPress={handleViewCart}
        >
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{selectedItems.length}</Text>
          </View>
          <Ionicons name="cart-outline" size={24} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      {/* Animated Main Content */}
      <Animated.ScrollView 
        style={[styles.scrollView, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <FontAwesome5 name="leaf" size={16} color="#27AE60" />
            <Text style={styles.heroBadgeText}>HEALTHIER CHOICES</Text>
          </View>
          <Text style={styles.heroTitle}>
            Smart Alternatives{' '}
            <Text style={styles.heroTitleHighlight}>Found!</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            We found {recommendations.length} better options for your cart
          </Text>
        </View>

        {/* Stats Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsContainer}
        >
          <View key="stat-1" style={[styles.statCard, styles.statCardPrimary]}>
            <MaterialIcons name="star-border" size={24} color="#27AE60" />
            <Text style={styles.statCardNumber}>92</Text>
            <Text style={styles.statCardLabel}>Avg. Health Score</Text>
          </View>
          
          <View key="stat-2" style={styles.statCard}>
            <MaterialIcons name="trending-up" size={24} color="#3498DB" />
            <Text style={styles.statCardNumber}>32%</Text>
            <Text style={styles.statCardLabel}>Healthier Avg.</Text>
          </View>
          
          <View key="stat-3" style={styles.statCard}>
            <MaterialIcons name="savings" size={24} color="#9B59B6" />
            <Text style={styles.statCardNumber}>$6.30</Text>
            <Text style={styles.statCardLabel}>Potential Savings</Text>
          </View>
        </ScrollView>

        {/* Recommendations Grid */}
        <View style={styles.recommendationsHeader}>
          <Text style={styles.recommendationsTitle}>Recommended Products</Text>
          <TouchableOpacity>
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {recommendations.map((item, index) => (
          <Animated.View 
            key={item.id}
            style={[
              styles.recommendationCard,
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50 * (index + 1), 0]
                  })
                }]
              }
            ]}
          >
            {/* Product Header */}
            <View style={styles.cardHeader}>
              <View style={styles.productIconContainer}>
                <Text style={styles.productIcon}>{item.icon}</Text>
              </View>
              
              <View style={styles.productMainInfo}>
                <View style={styles.productTitleRow}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(item.rating) }]}>
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                </View>
                <Text style={styles.productBrand}>{item.brand}</Text>
                
                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>{item.price}</Text>
                  <View style={styles.savingsBadge}>
                    <Ionicons name="pricetag" size={12} color="#fff" />
                    <Text style={styles.savingsText}>{item.savings}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Improvement & Score */}
            <View style={styles.improvementSection}>
              <View style={styles.improvementBadge}>
                <MaterialIcons name="show-chart" size={16} color="#27AE60" />
                <Text style={styles.improvementValue}>{item.improvement}</Text>
                <Text style={styles.improvementLabel}>healthier</Text>
              </View>
              
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Health Score</Text>
                <View style={styles.scoreBar}>
                  <View 
                    style={[
                      styles.scoreFill,
                      { width: `${item.score}%` }
                    ]}
                  />
                </View>
                <Text style={styles.scoreValue}>{item.score}/100</Text>
              </View>
            </View>

            {/* Store & Distance */}
            <View style={styles.storeInfo}>
              <Ionicons name="location-outline" size={14} color="#7F8C8D" />
              <Text style={styles.storeText}>{item.store}</Text>
              <View style={styles.distanceBadge}>
                <Ionicons name="walk" size={12} color="#fff" />
                <Text style={styles.distanceText}>{item.distance}</Text>
              </View>
            </View>

            {/* Nutrient Highlights */}
            <View style={styles.nutrientsContainer}>
              {Object.entries(item.nutrients).map(([key, value], idx) => 
                renderNutrientBadge(key, value, idx)
              )}
            </View>

            {/* Reason & Action */}
            <View style={styles.reasonSection}>
              <View style={styles.reasonBox}>
                <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
                <Text style={styles.reasonText}>{item.reason}</Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  selectedItems.includes(item.id) && styles.actionButtonSelected
                ]}
                onPress={() => handleAddToCart(item.id)}
              >
                {selectedItems.includes(item.id) ? (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Added</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Add to Cart</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={styles.startShoppingButton}
            onPress={() => router.push('/(screens)/LoginScreen')}
          >
            <Ionicons name="storefront" size={20} color="#fff" />
            <Text style={styles.startShoppingButtonText}>Find Stores Near You</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.viewCartButton,
              selectedItems.length === 0 && styles.disabledButton
            ]}
            onPress={handleViewCart}
            disabled={selectedItems.length === 0}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.viewCartButtonText}>
              View Cart ({selectedItems.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>How we calculate health scores:</Text>
          <View style={styles.footerGrid}>
            <View key="footer-1" style={styles.footerItem}>
              <Ionicons name="nutrition" size={16} color="#27AE60" />
              <Text style={styles.footerText}>Nutrient density</Text>
            </View>
            <View key="footer-2" style={styles.footerItem}>
              <Ionicons name="flask" size={16} color="#3498DB" />
              <Text style={styles.footerText}>Ingredient quality</Text>
            </View>
            <View key="footer-3" style={styles.footerItem}>
              <Ionicons name="medical" size={16} color="#9B59B6" />
              <Text style={styles.footerText}>Health impact</Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 4,
    fontWeight: '500',
  },
  headerCenter: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    color: '#27AE60',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  cartIcon: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
    marginLeft: 6,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 36,
  },
  heroTitleHighlight: {
    color: '#27AE60',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  statsScroll: {
    marginBottom: 24,
  },
  statsContainer: {
    paddingHorizontal: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginRight: 12,
    width: width * 0.4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  statCardPrimary: {
    backgroundColor: '#27AE60',
  },
  statCardNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  recommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  filterText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productIcon: {
    fontSize: 32,
  },
  productMainInfo: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productBrand: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginRight: 12,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  improvementSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  improvementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  improvementValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27AE60',
    marginHorizontal: 4,
  },
  improvementLabel: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '500',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  scoreBar: {
    width: 100,
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  scoreFill: {
    height: '100%',
    backgroundColor: '#27AE60',
    borderRadius: 3,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 6,
    marginRight: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C3E50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  nutrientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  nutrientBadge: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  nutrientLabel: {
    fontSize: 10,
    color: '#7F8C8D',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  nutrientValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
  },
  reasonSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  reasonText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 8,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27AE60',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 120,
    justifyContent: 'center',
  },
  actionButtonSelected: {
    backgroundColor: '#2C3E50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  bottomActions: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  startShoppingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 12,
  },
  startShoppingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    paddingVertical: 18,
    borderRadius: 12,
  },
  viewCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#95A5A6',
    opacity: 0.6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginTop: 24,
    borderRadius: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
  },
  footerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  footerItem: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default RecommendationsScreen;