import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Image
} from 'react-native';

const { width } = Dimensions.get('window');

import { router } from 'expo-router';
const ProductAnalysisScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with time and app name */}
      <View style={styles.header}>
        <Text style={styles.time}>9:56</Text>
        <Text style={styles.appName}>To Go Grocery</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Scanner Icon/Placeholder */}
        <View style={styles.scannerContainer}>
          <View style={styles.scannerIcon}>
            <Text style={styles.scannerText}>📱</Text>
            <View style={styles.scanLine} />
          </View>
          <Text style={styles.scannerLabel}>Point camera at barcode</Text>
        </View>

        <Text style={styles.screenTitle}>Smart Product Scan</Text>
        
        {/* Rating Cards */}
        <View style={styles.ratingContainer}>
          <View style={styles.ratingCard}>
            <View style={[styles.ratingBadge, styles.healthyBadge]}>
              <Text style={styles.ratingBadgeText}>A</Text>
            </View>
            <Text style={styles.ratingTitle}>Healthy</Text>
            <Text style={styles.ratingDescription}>Excellent nutritional value</Text>
            <View style={styles.ratingIndicator}>
              <View style={[styles.indicatorBar, styles.healthyBar]} />
              <Text style={styles.ratingScore}>85/100</Text>
            </View>
          </View>
          
          <View style={styles.ratingCard}>
            <View style={[styles.ratingBadge, styles.unhealthyBadge]}>
              <Text style={styles.ratingBadgeText}>D</Text>
            </View>
            <Text style={styles.ratingTitle}>Unhealthy</Text>
            <Text style={styles.ratingDescription}>High in additives</Text>
            <View style={styles.ratingIndicator}>
              <View style={[styles.indicatorBar, styles.unhealthyBar]} />
              <Text style={styles.ratingScore}>32/100</Text>
            </View>
          </View>
        </View>

        {/* Features List */}
        <View style={styles.featuresBox}>
          <Text style={styles.featuresTitle}>What we analyze:</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🥦</Text>
            <Text style={styles.featureText}>Nutritional value</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚡</Text>
            <Text style={styles.featureText}>Additives & Preservatives</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🌱</Text>
            <Text style={styles.featureText}>Organic certification</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>Ingredient quality score</Text>
          </View>
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.scanButton}>
            <Text style={styles.scanButtonText}>Scan Product</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={() => router.push('/(screens)/RecommendationsScreen')}
          >
            <Text style={styles.nextButtonText}>See Alternatives →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  time: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    width: 60,
  },
  appName: {
    fontSize: 18,
    color: '#27AE60',
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scannerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scannerIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E1F0FF',
    position: 'relative',
    marginBottom: 15,
  },
  scannerText: {
    fontSize: 48,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: '#27AE60',
    top: '50%',
  },
  scannerLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 25,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  ratingCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  ratingBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  healthyBadge: {
    backgroundColor: '#27AE60',
  },
  unhealthyBadge: {
    backgroundColor: '#E74C3C',
  },
  ratingBadgeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  ratingDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 15,
  },
  ratingIndicator: {
    width: '100%',
    alignItems: 'center',
  },
  indicatorBar: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    marginBottom: 8,
  },
  healthyBar: {
    backgroundColor: '#27AE60',
  },
  unhealthyBar: {
    backgroundColor: '#E74C3C',
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495E',
  },
  featuresBox: {
    backgroundColor: '#F8F9FA',
    padding: 25,
    borderRadius: 15,
    width: width * 0.9,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  featureText: {
    fontSize: 15,
    color: '#5D6D7E',
    flex: 1,
  },
  navigationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#27AE60',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ProductAnalysisScreen;