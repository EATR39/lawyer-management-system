/**
 * Avukat Yönetim Sistemi - Dashboard Sayfası
 * Ana gösterge paneli
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import {
  People as PeopleIcon,
  Gavel as GavelIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Event as EventIcon,
  CheckCircle,
  Cancel,
  Schedule
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { apiService } from '../services/api';

// Grafik renkleri
const COLORS = ['#1976d2', '#9c27b0', '#2e7d32', '#ed6c02', '#d32f2f', '#0288d1'];

/**
 * İstatistik kartı bileşeni
 */
const StatCard = ({ title, value, subtitle, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: `${color}.light`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 28, color: `${color}.main` } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

/**
 * Dashboard sayfası bileşeni
 */
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats();
      setStats(response.data);
    } catch (err) {
      setError('İstatistikler yüklenemedi');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(value);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Hoş geldiniz! İşte bugünkü özet.
      </Typography>

      {/* İstatistik kartları */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Müvekkil"
            value={stats?.clients?.total || 0}
            subtitle={`${stats?.clients?.new_this_month || 0} yeni bu ay`}
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Aktif Davalar"
            value={stats?.cases?.active || 0}
            subtitle={`${stats?.cases?.total || 0} toplam dava`}
            icon={<GavelIcon />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Aylık Gelir"
            value={formatCurrency(stats?.finance?.monthly_income || 0)}
            subtitle={`Net: ${formatCurrency(stats?.finance?.monthly_income - stats?.finance?.monthly_expense || 0)}`}
            icon={<AccountBalanceIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Bekleyen Ödemeler"
            value={formatCurrency(stats?.finance?.pending_payments || 0)}
            subtitle={`${stats?.leads?.needs_follow_up || 0} takip gereken lead`}
            icon={<TrendingUpIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Grafikler */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Aylık gelir trendi */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={500} gutterBottom>
                Aylık Gelir Trendi
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.finance?.monthly_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(label) => `Ay: ${label}`}
                    />
                    <Bar dataKey="income" fill="#1976d2" name="Gelir" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Dava türleri */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={500} gutterBottom>
                Dava Türlerine Göre Dağılım
              </Typography>
              <Box sx={{ height: 260, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.cases?.by_type || []}
                      dataKey="count"
                      nameKey="type_display"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {(stats?.cases?.by_type || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alt paneller */}
      <Grid container spacing={3}>
        {/* Yaklaşan duruşmalar */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={500} gutterBottom>
                Yaklaşan Duruşmalar
              </Typography>
              {stats?.upcoming_hearings?.length > 0 ? (
                <List>
                  {stats.upcoming_hearings.map((hearing) => (
                    <ListItem key={hearing.id} divider>
                      <ListItemIcon>
                        <EventIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={hearing.title}
                        secondary={
                          <>
                            {hearing.location && `${hearing.location} • `}
                            {format(new Date(hearing.start_datetime), 'dd MMM yyyy HH:mm', { locale: tr })}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Yaklaşan duruşma bulunmuyor.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Dava özeti */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={500} gutterBottom>
                Dava Durumu Özeti
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <Chip
                  icon={<Schedule />}
                  label={`${stats?.cases?.active || 0} Aktif`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  icon={<CheckCircle />}
                  label={`${stats?.cases?.won || 0} Kazanıldı`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<Cancel />}
                  label={`${stats?.cases?.lost || 0} Kaybedildi`}
                  color="error"
                  variant="outlined"
                />
              </Box>

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                Lead Durumu
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Chip
                  label={`${stats?.leads?.new || 0} Yeni Lead`}
                  color="info"
                  size="small"
                />
                <Chip
                  label={`${stats?.leads?.converted || 0} Dönüştürüldü`}
                  color="success"
                  size="small"
                />
                <Chip
                  label={`${stats?.leads?.needs_follow_up || 0} Takip Bekliyor`}
                  color="warning"
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
