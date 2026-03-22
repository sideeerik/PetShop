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
const MONTH_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

export default function Dashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [productSales, setProductSales] = useState(null);
  const [recentBuyers, setRecentBuyers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly'); // 'monthly' or 'yearly'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [dateRangeData, setDateRangeData] = useState(null);
  const [dateRangeType, setDateRangeType] = useState('daily'); // 'daily', 'monthly', 'yearly'

  const fetchDashboardData = async () => {
    try {
      const token = await getToken();
      const salesQuery = `type=${selectedPeriod}&year=${selectedYear}${
        selectedPeriod === 'monthly' && selectedMonth !== 'all'
          ? `&month=${selectedMonth}`
          : ''
      }`;

      // Fetch all data in parallel
      const [
        salesResponse,
        statisticsResponse,
        productSalesResponse,
        recentBuyersResponse,
        dateRangeResponse,
      ] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/v1/sales/monthly?${salesQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BACKEND_URL}/api/v1/sales/statistics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BACKEND_URL}/api/v1/sales/products?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BACKEND_URL}/api/v1/sales/recent-buyers?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // Get last 30 days data for bar chart
        axios.get(
          `${BACKEND_URL}/api/v1/sales/date-range?startDate=${getLast30Days()}&endDate=${getToday()}&groupBy=${dateRangeType}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
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

  const getToday = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, selectedYear, selectedMonth, dateRangeType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const displayCurrency = (amount) => `\u20B1${(Number(amount) || 0).toFixed(2)}`;

  const formatNumber = (num) => num?.toLocaleString() || '0';

  const formatCompactCurrency = (amount) => {
    const value = Number(amount) || 0;
    const absoluteValue = Math.abs(value);

    if (absoluteValue >= 1000000) {
      const compactValue = (value / 1000000).toFixed(absoluteValue >= 10000000 ? 0 : 1);
      return `\u20B1${compactValue.replace(/\.0$/, '')}M`;
    }

    if (absoluteValue >= 1000) {
      const compactValue = (value / 1000).toFixed(absoluteValue >= 10000 ? 0 : 1);
      return `\u20B1${compactValue.replace(/\.0$/, '')}k`;
    }

    return `\u20B1${value.toLocaleString('en-PH', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const selectedMonthLabel =
    MONTH_OPTIONS.find((option) => option.value === selectedMonth)?.label || 'All';

  const lineChartTitle =
    selectedPeriod === 'monthly'
      ? `Sales Trend (${selectedMonth === 'all' ? `Monthly - ${selectedYear}` : `${selectedMonthLabel} ${selectedYear}`})`
      : `Sales Trend (Yearly - ${selectedYear})`;
  const hasLineChartSales = (salesData?.sales || []).some(
    (item) => Number(item.totalSales) > 0
  );
  const shouldUseFilteredSnapshot =
    (selectedPeriod === 'monthly' && selectedMonth !== 'all') || !hasLineChartSales;

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

    const labels = salesData.sales.map((item) => {
      if (selectedPeriod === 'monthly') {
        return item.period.substring(0, 3);
      }
      return item.period;
    });

    const values = salesData.sales.map((item) => item.totalSales);

    return {
      labels,
      datasets: [
        {
          data: values,
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          strokeWidth: 2,
        },
      ],
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
      labels = last7Days.map((item) => {
        const date = new Date(item.period);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });
      values = last7Days.map((item) => item.totalSales);
    } else if (dateRangeType === 'monthly') {
      labels = dateRangeData.sales.map((item) => {
        const [year, month] = item.period.split('-');
        return `${month}/${year}`;
      });
      values = dateRangeData.sales.map((item) => item.totalSales);
    } else {
      labels = dateRangeData.sales.map((item) => item.period);
      values = dateRangeData.sales.map((item) => item.totalSales);
    }

    return {
      labels,
      datasets: [
        {
          data: values,
        },
      ],
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
                  {displayCurrency(buyer.orderTotal)}
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
                    {displayCurrency(item.totalPrice)}
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
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Admin Overview</Text>
            <Text style={styles.heroTitle}>Sales Dashboard</Text>
            <Text style={styles.heroSubtitle}>
              Monitor revenue, orders, product performance, and recent buyers in one place.
            </Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Icon name="insights" size={34} color="#7A4B2A" />
          </View>
        </View>

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

          {selectedPeriod === 'monthly' && (
            <View style={styles.monthFilterSection}>
              <Text style={styles.monthFilterLabel}>Month Filter:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthFilterList}
              >
                {MONTH_OPTIONS.map((monthOption) => (
                  <TouchableOpacity
                    key={monthOption.value}
                    style={[
                      styles.monthFilterChip,
                      selectedMonth === monthOption.value && styles.monthFilterChipActive,
                    ]}
                    onPress={() => setSelectedMonth(monthOption.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.monthFilterChipText,
                        selectedMonth === monthOption.value && styles.monthFilterChipTextActive,
                      ]}
                    >
                      {monthOption.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Statistics Cards */}
        {statistics && (
          <View style={styles.statsGrid}>
            <StatCard
              title="Today"
              value={displayCurrency(statistics.today?.revenue)}
              icon="today"
              color="#FF6B6B"
              subtitle={`${statistics.today?.orders || 0} orders`}
            />
            <StatCard
              title="This Week"
              value={displayCurrency(statistics.week?.revenue)}
              icon="date-range"
              color="#4ECDC4"
              subtitle={`${statistics.week?.orders || 0} orders`}
            />
            <StatCard
              title="This Month"
              value={displayCurrency(statistics.month?.revenue)}
              icon="calendar-month"
              color="#45B7D1"
              subtitle={`${statistics.month?.orders || 0} orders`}
            />
            <StatCard
              title="This Year"
              value={displayCurrency(statistics.year?.revenue)}
              icon="calendar-today"
              color="#96CEB4"
              subtitle={`${statistics.year?.orders || 0} orders`}
            />
          </View>
        )}

        {/* Line Chart - Sales Trend */}
        {salesData && lineChartData && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>{lineChartTitle}</Text>
            {shouldUseFilteredSnapshot ? (
              <View style={styles.filteredSnapshot}>
                <View style={styles.filteredSnapshotBadge}>
                  <Text style={styles.filteredSnapshotBadgeText}>
                    {selectedPeriod === 'monthly' ? `${selectedMonthLabel} ${selectedYear}` : selectedYear}
                  </Text>
                </View>
                <Text style={styles.filteredSnapshotValue}>
                  {displayCurrency(salesData.summary?.totalRevenue)}
                </Text>
                <Text style={styles.filteredSnapshotText}>
                  {salesData.summary?.totalOrders > 0
                    ? `${formatNumber(salesData.summary.totalOrders)} order${salesData.summary.totalOrders > 1 ? 's' : ''} recorded${selectedPeriod === 'monthly' && selectedMonth !== 'all' ? ` for ${selectedMonthLabel}` : ''}.`
                    : `No sales recorded${selectedPeriod === 'monthly' && selectedMonth !== 'all' ? ` for ${selectedMonthLabel} ${selectedYear}` : ` in ${selectedYear}`}.`}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={lineChartData}
                  width={Math.max(SCREEN_WIDTH - 32, lineChartData.labels.length * 72)}
                  height={220}
                  chartConfig={chartConfig}
                  bezier={lineChartData.labels.length > 2}
                  style={styles.chart}
                  formatYLabel={(value) => formatCompactCurrency(value)}
                  fromZero
                  segments={4}
                />
              </ScrollView>
            )}
            {salesData.summary && (
              <View style={styles.chartSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Revenue</Text>
                  <Text style={styles.summaryValue}>{displayCurrency(salesData.summary.totalRevenue)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Orders</Text>
                  <Text style={styles.summaryValue}>{formatNumber(salesData.summary.totalOrders)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Avg Order Value</Text>
                  <Text style={styles.summaryValue}>{displayCurrency(salesData.summary.averageOrderValue)}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Bar Chart - Daily/Weekly Sales */}
        {barChartData && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Daily Sales (Last 7 Days)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barChartData}
                width={Math.max(SCREEN_WIDTH - 32, barChartData.labels.length * 70)}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                formatYLabel={(value) => formatCompactCurrency(value)}
                fromZero
                showValuesOnTopOfBars
                segments={4}
              />
            </ScrollView>
            {dateRangeData?.summary && (
              <View style={styles.chartSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Period Revenue</Text>
                  <Text style={styles.summaryValue}>{displayCurrency(dateRangeData.summary.totalRevenue)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Period Orders</Text>
                  <Text style={styles.summaryValue}>{formatNumber(dateRangeData.summary.totalOrders)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Daily Average</Text>
                  <Text style={styles.summaryValue}>
                    {displayCurrency(dateRangeData.summary.totalRevenue / 7)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Pie Chart - Product Sales Distribution */}
        {productSales && pieChartData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Top Products by Revenue</Text>
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
                      {displayCurrency(product.totalRevenue)}
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
                <Text style={styles.allTimeValue}>{displayCurrency(statistics.allTime?.revenue)}</Text>
              </View>
              <View style={styles.allTimeItem}>
                <Text style={styles.allTimeLabel}>Total Orders</Text>
                <Text style={styles.allTimeValue}>{formatNumber(statistics.allTime?.orders)}</Text>
              </View>
              <View style={styles.allTimeItem}>
                <Text style={styles.allTimeLabel}>Avg Order Value</Text>
                <Text style={styles.allTimeValue}>
                  {displayCurrency(
                    statistics.allTime?.orders > 0
                      ? statistics.allTime.revenue / statistics.allTime.orders
                      : 0
                  )}
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
    backgroundColor: '#F6EDE3',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6EDE3',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7C6555',
  },
  heroCard: {
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FDF7F1',
    borderWidth: 1,
    borderColor: '#E8D6C3',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A87B54',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#7C6555',
  },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  selectorContainer: {
    backgroundColor: '#FFFDF9',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  selectorLabel: {
    fontSize: 14,
    color: '#7C6555',
    marginBottom: 8,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3E3D3',
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
    backgroundColor: '#8B5E3C',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C6555',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  monthFilterSection: {
    marginTop: 14,
  },
  monthFilterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C6555',
    marginBottom: 10,
  },
  monthFilterList: {
    paddingRight: 8,
  },
  monthFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#F3E3D3',
    marginRight: 8,
  },
  monthFilterChipActive: {
    backgroundColor: '#8B5E3C',
  },
  monthFilterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C6555',
  },
  monthFilterChipTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E7D8C8',
    borderRightColor: '#E7D8C8',
    borderBottomColor: '#E7D8C8',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#7C6555',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9A846F',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#FFFDF9',
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E2A1F',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  filteredSnapshot: {
    minHeight: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8D6C3',
    backgroundColor: '#FCF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    marginVertical: 8,
  },
  filteredSnapshotBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F3E3D3',
    marginBottom: 16,
  },
  filteredSnapshotBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5E3C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filteredSnapshotValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  filteredSnapshotText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#7C6555',
    textAlign: 'center',
  },
  chartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EFE0D2',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7C6555',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5E3C',
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
    borderBottomColor: '#EFE0D2',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E2A1F',
    marginBottom: 2,
  },
  productStats: {
    fontSize: 12,
    color: '#8E7665',
  },
  productRevenue: {
    alignItems: 'flex-end',
  },
  productRevenueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B5E3C',
  },
  productPercentage: {
    fontSize: 12,
    color: '#8E7665',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFFDF9',
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3E2A1F',
    marginBottom: 16,
  },
  buyerCard: {
    backgroundColor: '#F9F2EB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  buyerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5E3C',
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
    fontWeight: '700',
    color: '#3E2A1F',
  },
  buyerEmail: {
    fontSize: 12,
    color: '#7C6555',
    marginTop: 2,
  },
  buyerDate: {
    fontSize: 10,
    color: '#9A846F',
    marginTop: 2,
  },
  buyerAmount: {
    marginLeft: 8,
  },
  buyerAmountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5E3C',
  },
  buyerItems: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8D6C3',
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
    color: '#7C6555',
  },
  buyerItemQty: {
    fontSize: 12,
    color: '#8E7665',
    marginHorizontal: 8,
  },
  buyerItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3E2A1F',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E7665',
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
    color: '#7C6555',
    marginBottom: 4,
  },
  allTimeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5E3C',
  },
});
