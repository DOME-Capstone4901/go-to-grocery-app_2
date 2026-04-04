import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  SafeAreaView,
  ScrollView
} from 'react-native';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);

  const slides = [
    {
      id: 1,
      title: 'Welcome to Go Grocery!',
      description: 'Your smart grocery companion that helps you make healthier food choices while shopping.',
      buttonText: 'Slide to continue',
      icon: '🛒'
    },
    {
      id: 2,
      title: 'Buy Smart Product',
      subtitle: 'Healthy / Unhealthy',
      description: 'Scan products instantly to see their nutrition score and health impact.',
      buttonText: 'Continue',
      icon: '📊'
    },
    {
      id: 3,
      title: 'Better Alternatives',
      description: 'Get personalized recommendations for healthier grocery options.',
      buttonText: "Start Shopping!",
      icon: '✨'
    }
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current.scrollTo({
        x: width * nextIndex,
        animated: true
      });
      setCurrentIndex(nextIndex);
    } else {
      // Navigate to ProductAnalysis when on last slide
      navigation.navigate('ProductAnalysis');
    }
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
  };

  const handleDotPress = (index) => {
    scrollViewRef.current.scrollTo({
      x: width * index,
      animated: true
    });
    setCurrentIndex(index);
  };

  const Slide = ({ slide, index }) => {
    const isLast = index === slides.length - 1;
    
    const handlePress = () => {
      if (isLast) {
        navigation.navigate('ProductAnalysis');
      } else {
        handleNext();
      }
    };

    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.content}>
          {/* Icon Container */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{slide.icon}</Text>
          </View>
          
          <Text style={styles.title}>{slide.title}</Text>
          {slide.subtitle && (
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          )}
          <Text style={styles.description}>{slide.description}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.button, isLast && styles.lastButton]}
          onPress={handlePress}
        >
          <Text style={[styles.buttonText, isLast && styles.lastButtonText]}>
            {slide.buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <Slide key={slide.id} slide={slide} index={index} />
        ))}
      </ScrollView>
      
      {/* Custom Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              currentIndex === index && styles.activeDot
            ]}
            onPress={() => handleDotPress(index)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#E1F0FF',
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#27AE60',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 17,
    color: '#5D6D7E',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  button: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: width * 0.8,
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lastButton: {
    backgroundColor: '#27AE60',
    borderColor: '#219653',
  },
  buttonText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '600',
  },
  lastButtonText: {
    color: '#fff',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: '#27AE60',
    width: 24,
    height: 10,
    borderRadius: 5,
  },
});

export default WelcomeScreen;