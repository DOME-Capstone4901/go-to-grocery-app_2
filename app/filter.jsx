import React, { useState, useMemo } from 'react';
import {Link} from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';

// Sample pantry items data structure
const samplePantryItems = [
  { id: '1', name: 'Milk', category: 'Dairy', expirationDate: '2026-01-20', quantity: 2 },
  { id: '2', name: 'Bread', category: 'Bakery', expirationDate: '2026-01-18', quantity: 1 },
  { id: '3', name: 'Apples', category: 'Fruits', expirationDate: '2026-01-25', quantity: 5 },
  { id: '4', name: 'Chicken', category: 'Meat', expirationDate: '2026-01-16', quantity: 1 },
  { id: '5', name: 'Rice', category: 'Grains', expirationDate: '2027-01-14', quantity: 1 },
  { id: '6', name: 'Yogurt', category: 'Dairy', expirationDate: '2026-01-22', quantity: 3 },
  { id: '7', name: 'Tomatoes', category: 'Vegetables', expirationDate: '2026-01-19', quantity: 4 },
];

const categories = ['All', 'Dairy', 'Bakery', 'Fruits', 'Vegetables', 'Meat', 'Grains', 'Canned', 'Frozen'];

const expirationFilters = [
  { label: 'All', value: 'all' },
  { label: 'Expiring Soon (3 days)', value: 'soon' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Expired', value: 'expired' },
];

const PantryFilter = () => {
  const [pantryItems, setPantryItems] = useState(samplePantryItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedExpiration, setSelectedExpiration] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // name, expiration, category

  // Calculate days until expiration
  const getDaysUntilExpiration = (expirationDate) => {
    const today = new Date('2026-01-14'); // Current date from context
    const expDate = new Date(expirationDate);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter logic
  const filteredItems = useMemo(() => {
    let filtered = [...pantryItems];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Expiration filter
    if (selectedExpiration !== 'all') {
      filtered = filtered.filter(item => {
        const daysUntil = getDaysUntilExpiration(item.expirationDate);
        
        switch (selectedExpiration) {
          case 'expired':
            return daysUntil < 0;
          case 'soon':
            return daysUntil >= 0 && daysUntil <= 3;
          case 'week':
            return daysUntil >= 0 && daysUntil <= 7;
          case 'month':
            return daysUntil >= 0 && daysUntil <= 30;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'expiration':
          return new Date(a.expirationDate) - new Date(b.expirationDate);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [pantryItems, searchQuery, selectedCategory, selectedExpiration, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedExpiration('all');
    setSortBy('name');
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (selectedExpiration !== 'all') count++;
    if (searchQuery) count++;
    return count;
  };

  const renderPantryItem = ({ item }) => {
    const daysUntil = getDaysUntilExpiration(item.expirationDate);
    const isExpired = daysUntil < 0;
    const isExpiringSoon = daysUntil >= 0 && daysUntil <= 3;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={[
            styles.categoryBadge,
            isExpired && styles.expiredBadge,
            isExpiringSoon && styles.soonBadge
          ]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.detailText}>Quantity: {item.quantity}</Text>
          <Text style={[
            styles.detailText,
            isExpired && styles.expiredText,
            isExpiringSoon && styles.soonText
          ]}>
            {isExpired 
              ? `Expired ${Math.abs(daysUntil)} days ago`
              : `Expires in ${daysUntil} days`
            }
          </Text>
        </View>
        
        <Text style={styles.dateText}>{item.expirationDate}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Pantry</Text>
        <Text style={styles.itemCount}>{filteredItems.length} items</Text>
        <Link href="/">Back Home</Link>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickFilters}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterChip,
              selectedCategory === category && styles.filterChipActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.filterChipText,
              selectedCategory === category && styles.filterChipTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterButtonText}>
            ⚙️ Filters {activeFiltersCount() > 0 && `(${activeFiltersCount()})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            const nextSort = sortBy === 'name' ? 'expiration' : sortBy === 'expiration' ? 'category' : 'name';
            setSortBy(nextSort);
          }}
        >
          <Text style={styles.sortButtonText}>
            Sort: {sortBy === 'name' ? '📝 Name' : sortBy === 'expiration' ? '📅 Date' : '🏷️ Category'}
          </Text>
        </TouchableOpacity>

        {activeFiltersCount() > 0 && (
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderPantryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Options</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Expiration Date</Text>
            {expirationFilters.map(filter => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterOption,
                  selectedExpiration === filter.value && styles.filterOptionActive
                ]}
                onPress={() => {
                  setSelectedExpiration(filter.value);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedExpiration === filter.value && styles.filterOptionTextActive
                ]}>
                  {filter.label}
                </Text>
                {selectedExpiration === filter.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  itemCount: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    fontSize: 20,
    color: '#999',
    paddingLeft: 10,
  },
  quickFilters: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginRight: 10,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#333',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 'auto',
  },
  listContainer: {
    padding: 15,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
  },
  expiredBadge: {
    backgroundColor: '#ffebee',
  },
  soonBadge: {
    backgroundColor: '#fff3e0',
  },
  categoryText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  expiredText: {
    color: '#d32f2f',
    fontWeight: '600',
  },
  soonText: {
    color: '#f57c00',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#e3f2fd',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
  filterOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PantryFilter;
