// CVPetShop/frontend/src/Components/AdminScreen/Dashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../../utils/helper';
import AdminDrawer from './AdminDrawer';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Dashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [productSales, setProductSales] = useState(null);
  const [recentBuyers, setRecentBuyers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly'); // 'monthly' or 'yearly'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateRangeData, setDateRangeData] = useState(null);
  const [dateRangeType, setDateRangeType] = useState('daily'); // 'daily', 'monthly', 'yearly'

  const fetchDashboardData = async () => {
    try {
      const token = await getToken();
      
      // Fetch all data in parallel
      const [
        salesResponse,
        statisticsResponse,
        productSalesResponse,
        recentBuyersResponse,
        dateRangeResponse
      ] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/v1/sales/monthly?type=${selectedPeriod}&year=${selectedYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/v1/sales/statistics`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/v1/sales/products?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/v1/sales/recent-buyers?limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        // Get last 30 days data for bar chart
        axios.get(`${BACKEND_URL}/api/v1/sales/date-range?startDate=${getLast30Days()}&endDate=${getToday()}&groupBy=${dateRangeType}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (salesResponse.data.success) {
        setSalesData(salesResponse.data.data);
      }
      
      if (statisticsResponse.data.success) {
        setStatistics(statisticsResponse.data.data);
      }
      
      if (productSalesResponse.data.success) {
        setProductSales(productSalesResponse.data.data);
      }
      
      if (recentBuyersResponse.data.success) {
        setRecentBuyers(recentBuyersResponse.data.data.recentBuyers || []);
      }

      if (dateRangeResponse.data.success) {
        setDateRangeData(dateRangeResponse.data.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getLast30Days = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };

  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, selectedYear, dateRangeType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount) => {
    return `₱${amount?.toFixed(2) || '0.00'}`;
  };

  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ff6b6b',
    },
    barPercentage: 0.7,
  };

  // Line Chart Data (Monthly/Yearly Sales)
  const getLineChartData = () => {
    if (!salesData?.sales) return null;

    const labels = salesData.sales.map(item => {
      if (selectedPeriod === 'monthly') {
        return item.period.substring(0, 3); // Short month name
      } else {
        return item.period; // Year
      }
    });

    const values = salesData.sales.map(item => item.totalSales);

    return {
      labels,
      datasets: [{
        data: values,
        color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  // Bar Chart Data (Daily/Weekly from date range)
  const getBarChartData = () => {
    if (!dateRangeData?.sales || dateRangeData.sales.length === 0) return null;

    let labels = [];
    let values = [];

    if (dateRangeType === 'daily') {
      // Show last 7 days for better visibility
      const last7Days = dateRangeData.sales.slice(-7);
      labels = last7Days.map(item => {
        const date = new Date(item.period);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });
      values = last7Days.map(item => item.totalSales);
    } else if (dateRangeType === 'monthly') {
      labels = dateRangeData.sales.map(item => {
        const [year, month] = item.period.split('-');
        return `${month}/${year}`;
      });
      values = dateRangeData.sales.map(item => item.totalSales);
    } else {
      labels = dateRangeData.sales.map(item => item.period);
      values = dateRangeData.sales.map(item => item.totalSales);
    }

    return {
      labels,
      datasets: [{
        data: values,
      }],
    };
  };

  // Pie Chart Data (Product Sales)
  const getPieChartData = () => {
    if (!productSales?.products) return [];

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];
    
    return productSales.products.map((item, index) => ({
      name: item.productName || 'Unknown',
      revenue: item.totalRevenue,
      color: colors[index % colors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
  };

  const lineChartData = getLineChartData();
  const barChartData = getBarChartData();
  const pieChartData = getPieChartData();

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const RecentBuyersList = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Buyers</Text>
      {recentBuyers.length > 0 ? (
        recentBuyers.map((buyer, index) => (
          <View key={index} style={styles.buyerCard}>
            <View style={styles.buyerHeader}>
              <View style={styles.buyerAvatar}>
                <Text style={styles.buyerAvatarText}>
                  {buyer.userName?.charAt(0).toUpperCase() || 'G'}
                </Text>
              </View>
              <View style={styles.buyerInfo}>
                <Text style={styles.buyerName}>{buyer.userName}</Text>
                <Text style={styles.buyerEmail}>{buyer.userEmail}</Text>
                <Text style={styles.buyerDate}>
                  {new Date(buyer.purchaseDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.buyerAmount}>
                <Text style={styles.buyerAmountText}>
                  {formatCurrency(buyer.orderTotal)}
                </Text>
              </View>
            </View>
            <View style={styles.buyerItems}>
              {buyer.items?.map((item, idx) => (
                <View key={idx} style={styles.buyerItem}>
                  <Text style={styles.buyerItemName} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={styles.buyerItemQty}>x{item.quantity}</Text>
                  <Text style={styles.buyerItemPrice}>
                    {formatCurrency(item.totalPrice)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="shopping-cart" size={40} color="#ccc" />
          <Text style={styles.emptyText}>No recent buyers</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <AdminDrawer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </AdminDrawer>
    );
  }

  return (
    <AdminDrawer>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Period Selector for Line Chart */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Line Chart Period:</Text>
          <View style={styles.periodSelector}>
            <TouchableOpacity
              style={[styles.periodButton, selectedPeriod === 'monthly' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('monthly')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'monthly' && styles.periodButtonTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, selectedPeriod === 'yearly' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('yearly')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'yearly' && styles.periodButtonTextActive]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics Cards */}
        {statistics && (
          <View style={styles.statsGrid}>
            <StatCard
              title="Today"
              value={formatCurrency(statistics.today?.revenue)}
              icon="today"
              color="#FF6B6B"
              subtitle={`${statistics.today?.orders || 0} orders`}
            />
            <StatCard
              title="This Week"
              value={formatCurrency(statistics.week?.revenue)}
              icon="date-range"
              color="#4ECDC4"
              subtitle={`${statistics.week?.orders || 0} orders`}
            />
            <StatCard
              title="This Month"
              value={formatCurrency(statistics.month?.revenue)}
              icon="calendar-month"
              color="#45B7D1"
              subtitle={`${statistics.month?.orders || 0} orders`}
            />
            <StatCard
              title="This Year"
              value={formatCurrency(statistics.year?.revenue)}
              icon="calendar-today"
              color="#96CEB4"
              subtitle={`${statistics.year?.orders || 0} orders`}
            />
          </View>
        )}

        {/* Line Chart - Sales Trend */}
        {salesData && lineChartData && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>
              📈 Sales Trend ({selectedPeriod === 'monthly' ? 'Monthly' : 'Yearly'} - {selectedYear})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={lineChartData}
                width={Math.max(SCREEN_WIDTH - 32, lineChartData.labels.length * 60)}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                formatYLabel={(value) => `₱${(parseInt(value) / 1000).toFixed(0)}k`}
                fromZero
              />
            </ScrollView>
            {salesData.summary && (
              <View style={styles.chartSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Revenue</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(salesData.summary.totalRevenue)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Orders</Text>
                  <Text style={styles.summaryValue}>{formatNumber(salesData.summary.totalOrders)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Avg Order Value</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(salesData.summary.averageOrderValue)}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Bar Chart - Daily/Weekly Sales */}
        {barChartData && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>
              📊 Daily Sales (Last 7 Days)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barChartData}
                width={Math.max(SCREEN_WIDTH - 32, barChartData.labels.length * 70)}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel="₱"
                yAxisSuffix=""
                fromZero
                showValuesOnTopOfBars
              />
            </ScrollView>
            {dateRangeData?.summary && (
              <View style={styles.chartSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Period Revenue</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(dateRangeData.summary.totalRevenue)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Period Orders</Text>
                  <Text style={styles.summaryValue}>{formatNumber(dateRangeData.summary.totalOrders)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Daily Average</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(dateRangeData.summary.totalRevenue / 7)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Pie Chart - Product Sales Distribution */}
        {productSales && pieChartData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>
              🥧 Top Products by Revenue
            </Text>
            <PieChart
              data={pieChartData}
              width={SCREEN_WIDTH - 32}
              height={220}
              chartConfig={chartConfig}
              accessor="revenue"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
            <View style={styles.productList}>
              {productSales.products.map((product, index) => (
                <View key={index} style={styles.productItem}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.productName}
                    </Text>
                    <Text style={styles.productStats}>
                      {product.totalQuantity} units • {product.orderCount} orders
                    </Text>
                  </View>
                  <View style={styles.productRevenue}>
                    <Text style={styles.productRevenueText}>
                      {formatCurrency(product.totalRevenue)}
                    </Text>
                    <Text style={styles.productPercentage}>
                      {product.percentage?.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Buyers */}
        <RecentBuyersList />

        {/* All-time Summary */}
        {statistics && (
          <View style={[styles.chartContainer, styles.allTimeContainer]}>
            <Text style={styles.chartTitle}>All-time Summary</Text>
            <View style={styles.allTimeStats}>
              <View style={styles.allTimeItem}>
                <Text style={styles.allTimeLabel}>Total Revenue</Text>
                <Text style={styles.allTimeValue}>{formatCurrency(statistics.allTime?.revenue)}</Text>
              </View>
              <View style={styles.allTimeItem}>
                <Text style={styles.allTimeLabel}>Total Orders</Text>
                <Text style={styles.allTimeValue}>{formatNumber(statistics.allTime?.orders)}</Text>
              </View>
              <View style={styles.allTimeItem}>
                <Text style={styles.allTimeLabel}>Avg Order Value</Text>
                <Text style={styles.allTimeValue}>
                  {formatCurrency(statistics.allTime?.orders > 0 
                    ? statistics.allTime.revenue / statistics.allTime.orders 
                    : 0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  selectorContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectorLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 21,
  },
  periodButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  productList: {
    marginTop: 16,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productStats: {
    fontSize: 12,
    color: '#999',
  },
  productRevenue: {
    alignItems: 'flex-end',
  },
  productRevenueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  productPercentage: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  buyerCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  buyerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buyerAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buyerInfo: {
    flex: 1,
  },
  buyerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buyerEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buyerDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  buyerAmount: {
    marginLeft: 8,
  },
  buyerAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  buyerItems: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  buyerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  buyerItemName: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  buyerItemQty: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 8,
  },
  buyerItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  allTimeContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  allTimeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  allTimeItem: {
    alignItems: 'center',
  },
  allTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  allTimeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
});