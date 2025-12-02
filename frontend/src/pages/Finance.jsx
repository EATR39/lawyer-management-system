/**
 * Avukat Yönetim Sistemi - Finans Sayfası
 * Finansal işlemler ve raporlar
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  TrendingUp,
  TrendingDown,
  AccountBalance
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { apiService } from '../services/api';

// Validasyon şeması
const validationSchema = Yup.object({
  transaction_type: Yup.string().required('İşlem tipi gereklidir'),
  category: Yup.string().required('Kategori gereklidir'),
  amount: Yup.number().positive('Miktar pozitif olmalıdır').required('Miktar gereklidir')
});

// Durum renkleri
const statusColors = {
  pending: 'warning',
  paid: 'success',
  cancelled: 'error',
  partial: 'info'
};

/**
 * Finans sayfası bileşeni
 */
const Finance = () => {
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [report, setReport] = useState(null);

  // Kategoriler
  const incomeCategories = {
    consultation_fee: 'Danışmanlık Ücreti',
    case_fee: 'Dava Ücreti',
    retainer_fee: 'Avans',
    court_expense_refund: 'Mahkeme Masrafı İadesi',
    other_income: 'Diğer Gelir'
  };

  const expenseCategories = {
    court_expense: 'Mahkeme Masrafı',
    travel_expense: 'Seyahat Masrafı',
    office_expense: 'Ofis Masrafı',
    personnel_expense: 'Personel Gideri',
    tax_payment: 'Vergi Ödemesi',
    other_expense: 'Diğer Gider'
  };

  const paymentMethods = {
    cash: 'Nakit',
    bank_transfer: 'Banka Havalesi',
    credit_card: 'Kredi Kartı',
    check: 'Çek'
  };

  // İşlemleri yükle
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const typeFilter = tabValue === 1 ? 'income' : tabValue === 2 ? 'expense' : '';
      const response = await apiService.getTransactions({
        page: page + 1,
        per_page: rowsPerPage,
        type: typeFilter
      });
      setTransactions(response.data.transactions);
      setTotal(response.data.total);
    } catch (err) {
      setError('İşlemler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, tabValue]);

  // Rapor yükle
  const loadReport = async () => {
    try {
      const response = await apiService.getFinanceReport();
      setReport(response.data);
    } catch (err) {
      console.error('Report error:', err);
    }
  };

  // İlişkili verileri yükle
  const loadRelatedData = async () => {
    try {
      const [clientsRes, casesRes] = await Promise.all([
        apiService.getClients({ per_page: 100 }),
        apiService.getCases({ per_page: 100 })
      ]);
      setClients(clientsRes.data.clients);
      setCases(casesRes.data.cases);
    } catch (err) {
      console.error('Related data error:', err);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadReport();
    loadRelatedData();
  }, [loadTransactions]);

  // Formik
  const formik = useFormik({
    initialValues: {
      transaction_type: 'income',
      category: '',
      amount: '',
      currency: 'TRY',
      date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: '',
      client_id: '',
      case_id: '',
      status: 'pending',
      receipt_no: '',
      description: ''
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (editingTransaction) {
          await apiService.updateTransaction(editingTransaction.id, values);
        } else {
          await apiService.createTransaction(values);
        }
        resetForm();
        setDialogOpen(false);
        setEditingTransaction(null);
        loadTransactions();
        loadReport();
      } catch (err) {
        setError(err.response?.data?.message || 'İşlem başarısız');
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Dialog aç
  const handleOpenDialog = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      formik.setValues({
        transaction_type: transaction.transaction_type,
        category: transaction.category,
        amount: transaction.amount,
        currency: transaction.currency || 'TRY',
        date: transaction.date || format(new Date(), 'yyyy-MM-dd'),
        payment_method: transaction.payment_method || '',
        client_id: transaction.client_id || '',
        case_id: transaction.case_id || '',
        status: transaction.status,
        receipt_no: transaction.receipt_no || '',
        description: transaction.description || ''
      });
    } else {
      setEditingTransaction(null);
      formik.resetForm();
    }
    setDialogOpen(true);
  };

  // Silme
  const handleDelete = async () => {
    if (!transactionToDelete) return;
    
    try {
      await apiService.deleteTransaction(transactionToDelete.id);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      loadTransactions();
      loadReport();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(value);
  };

  const categories = formik.values.transaction_type === 'income' ? incomeCategories : expenseCategories;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Finans
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Yeni İşlem
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Özet Kartları */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Toplam Gelir</Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {formatCurrency(report?.summary?.total_income || 0)}
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Toplam Gider</Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {formatCurrency(report?.summary?.total_expense || 0)}
                  </Typography>
                </Box>
                <TrendingDown color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Net Kar</Typography>
                  <Typography variant="h5" fontWeight={600} color="primary.main">
                    {formatCurrency(report?.summary?.net_profit || 0)}
                  </Typography>
                </Box>
                <AccountBalance color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ px: 2, pt: 1 }}>
          <Tab label="Tümü" />
          <Tab label="Gelirler" />
          <Tab label="Giderler" />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tarih</TableCell>
                <TableCell>Tip</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell>Müvekkil/Dava</TableCell>
                <TableCell>Miktar</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    İşlem bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {transaction.date ? format(new Date(transaction.date), 'dd.MM.yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.transaction_type_display}
                        color={transaction.transaction_type === 'income' ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{transaction.category_display}</TableCell>
                    <TableCell>
                      {transaction.client?.full_name || transaction.case?.case_number || '-'}
                    </TableCell>
                    <TableCell>
                      <Typography
                        fontWeight={500}
                        color={transaction.transaction_type === 'income' ? 'success.main' : 'error.main'}
                      >
                        {transaction.transaction_type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status_display}
                        color={statusColors[transaction.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Düzenle">
                        <IconButton onClick={() => handleOpenDialog(transaction)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton
                          onClick={() => {
                            setTransactionToDelete(transaction);
                            setDeleteDialogOpen(true);
                          }}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Sayfa başına:"
        />
      </Card>

      {/* Ekleme/Düzenleme Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {editingTransaction ? 'İşlem Düzenle' : 'Yeni İşlem'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="transaction_type"
                  label="İşlem Tipi"
                  value={formik.values.transaction_type}
                  onChange={(e) => {
                    formik.handleChange(e);
                    formik.setFieldValue('category', '');
                  }}
                >
                  <MenuItem value="income">Gelir</MenuItem>
                  <MenuItem value="expense">Gider</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="category"
                  label="Kategori"
                  value={formik.values.category}
                  onChange={formik.handleChange}
                  error={formik.touched.category && Boolean(formik.errors.category)}
                  helperText={formik.touched.category && formik.errors.category}
                >
                  {Object.entries(categories).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="amount"
                  label="Miktar (TL)"
                  type="number"
                  value={formik.values.amount}
                  onChange={formik.handleChange}
                  error={formik.touched.amount && Boolean(formik.errors.amount)}
                  helperText={formik.touched.amount && formik.errors.amount}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="date"
                  label="Tarih"
                  type="date"
                  value={formik.values.date}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="payment_method"
                  label="Ödeme Yöntemi"
                  value={formik.values.payment_method}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">Seçiniz</MenuItem>
                  {Object.entries(paymentMethods).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="status"
                  label="Durum"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="pending">Beklemede</MenuItem>
                  <MenuItem value="paid">Ödendi</MenuItem>
                  <MenuItem value="cancelled">İptal Edildi</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="client_id"
                  label="Müvekkil"
                  value={formik.values.client_id}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">Seçiniz</MenuItem>
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.full_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="case_id"
                  label="Dava"
                  value={formik.values.case_id}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">Seçiniz</MenuItem>
                  {cases.map((caseItem) => (
                    <MenuItem key={caseItem.id} value={caseItem.id}>
                      {caseItem.case_number}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="description"
                  label="Açıklama"
                  multiline
                  rows={2}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? <CircularProgress size={24} /> : 'Kaydet'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>İşlemi Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu işlemi silmek istediğinize emin misiniz?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Finance;
