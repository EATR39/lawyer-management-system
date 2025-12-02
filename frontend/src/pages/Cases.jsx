/**
 * Avukat Yönetim Sistemi - Davalar Sayfası
 * Dava listesi ve CRUD işlemleri
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
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
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  Gavel
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { apiService } from '../services/api';

// Validasyon şeması
const validationSchema = Yup.object({
  client_id: Yup.number().required('Müvekkil seçimi gereklidir'),
  case_type: Yup.string().required('Dava tipi gereklidir'),
  subject: Yup.string().required('Dava konusu gereklidir')
});

// Durum renkleri
const statusColors = {
  open: 'info',
  pending: 'warning',
  in_progress: 'primary',
  won: 'success',
  lost: 'error',
  settled: 'default',
  closed: 'default',
  appealed: 'secondary'
};

/**
 * Davalar sayfası bileşeni
 */
const Cases = () => {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);

  // Dava tipleri
  const caseTypes = {
    criminal: 'Ceza Davası',
    civil: 'Hukuk Davası',
    family: 'Aile Davası',
    labor: 'İş Davası',
    commercial: 'Ticaret Davası',
    administrative: 'İdare Davası',
    tax: 'Vergi Davası',
    execution: 'İcra Takibi',
    other: 'Diğer'
  };

  // Durumlar
  const statuses = {
    open: 'Açık',
    pending: 'Beklemede',
    in_progress: 'Devam Ediyor',
    won: 'Kazanıldı',
    lost: 'Kaybedildi',
    settled: 'Uzlaşıldı',
    closed: 'Kapatıldı',
    appealed: 'Temyizde'
  };

  // Davaları yükle
  const loadCases = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getCases({
        page: page + 1,
        per_page: rowsPerPage,
        search
      });
      setCases(response.data.cases);
      setTotal(response.data.total);
    } catch (err) {
      setError('Davalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  // Müvekkilleri ve avukatları yükle
  const loadRelatedData = async () => {
    try {
      const [clientsRes, lawyersRes] = await Promise.all([
        apiService.getClients({ per_page: 100 }),
        apiService.getLawyers()
      ]);
      setClients(clientsRes.data.clients);
      setLawyers(lawyersRes.data.lawyers);
    } catch (err) {
      console.error('Related data error:', err);
    }
  };

  useEffect(() => {
    loadCases();
    loadRelatedData();
  }, [loadCases]);

  // Formik
  const formik = useFormik({
    initialValues: {
      case_number: '',
      client_id: '',
      lawyer_id: '',
      case_type: '',
      court_name: '',
      subject: '',
      opposing_party: '',
      status: 'open',
      case_value: '',
      notes: ''
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (editingCase) {
          await apiService.updateCase(editingCase.id, values);
        } else {
          await apiService.createCase(values);
        }
        resetForm();
        setDialogOpen(false);
        setEditingCase(null);
        loadCases();
      } catch (err) {
        setError(err.response?.data?.message || 'İşlem başarısız');
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Dialog aç
  const handleOpenDialog = (caseItem = null) => {
    if (caseItem) {
      setEditingCase(caseItem);
      formik.setValues({
        case_number: caseItem.case_number || '',
        client_id: caseItem.client_id || '',
        lawyer_id: caseItem.lawyer_id || '',
        case_type: caseItem.case_type || '',
        court_name: caseItem.court_name || '',
        subject: caseItem.subject || '',
        opposing_party: caseItem.opposing_party || '',
        status: caseItem.status || 'open',
        case_value: caseItem.case_value || '',
        notes: caseItem.notes || ''
      });
    } else {
      setEditingCase(null);
      formik.resetForm();
    }
    setDialogOpen(true);
  };

  // Silme
  const handleDelete = async () => {
    if (!caseToDelete) return;
    
    try {
      await apiService.deleteCase(caseToDelete.id);
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
      loadCases();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Davalar
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Dava
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ p: 2 }}>
          <TextField
            placeholder="Dava ara..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
            sx={{ width: 300 }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Dava No</TableCell>
                <TableCell>Müvekkil</TableCell>
                <TableCell>Dava Tipi</TableCell>
                <TableCell>Mahkeme</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Sonraki Duruşma</TableCell>
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
              ) : cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Dava bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((caseItem) => (
                  <TableRow key={caseItem.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Gavel color="primary" fontSize="small" />
                        <Typography fontWeight={500}>
                          {caseItem.case_number}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{caseItem.client?.full_name || '-'}</TableCell>
                    <TableCell>{caseItem.case_type_display}</TableCell>
                    <TableCell>{caseItem.court_name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={caseItem.status_display}
                        color={statusColors[caseItem.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {caseItem.next_hearing_date 
                        ? format(new Date(caseItem.next_hearing_date), 'dd.MM.yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Düzenle">
                        <IconButton onClick={() => handleOpenDialog(caseItem)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton
                          onClick={() => {
                            setCaseToDelete(caseItem);
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
            {editingCase ? 'Dava Düzenle' : 'Yeni Dava'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="case_number"
                  label="Dava Numarası"
                  value={formik.values.case_number}
                  onChange={formik.handleChange}
                  helperText="Boş bırakılırsa otomatik oluşturulur"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="client_id"
                  label="Müvekkil"
                  value={formik.values.client_id}
                  onChange={formik.handleChange}
                  error={formik.touched.client_id && Boolean(formik.errors.client_id)}
                  helperText={formik.touched.client_id && formik.errors.client_id}
                >
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
                  name="case_type"
                  label="Dava Tipi"
                  value={formik.values.case_type}
                  onChange={formik.handleChange}
                  error={formik.touched.case_type && Boolean(formik.errors.case_type)}
                  helperText={formik.touched.case_type && formik.errors.case_type}
                >
                  {Object.entries(caseTypes).map(([key, value]) => (
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
                  name="lawyer_id"
                  label="Avukat"
                  value={formik.values.lawyer_id}
                  onChange={formik.handleChange}
                >
                  {lawyers.map((lawyer) => (
                    <MenuItem key={lawyer.id} value={lawyer.id}>
                      {lawyer.full_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="subject"
                  label="Dava Konusu"
                  multiline
                  rows={2}
                  value={formik.values.subject}
                  onChange={formik.handleChange}
                  error={formik.touched.subject && Boolean(formik.errors.subject)}
                  helperText={formik.touched.subject && formik.errors.subject}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="court_name"
                  label="Mahkeme"
                  value={formik.values.court_name}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="opposing_party"
                  label="Karşı Taraf"
                  value={formik.values.opposing_party}
                  onChange={formik.handleChange}
                />
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
                  {Object.entries(statuses).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="case_value"
                  label="Dava Değeri (TL)"
                  type="number"
                  value={formik.values.case_value}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="notes"
                  label="Notlar"
                  multiline
                  rows={3}
                  value={formik.values.notes}
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
        <DialogTitle>Davayı Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{caseToDelete?.case_number}" numaralı davayı silmek istediğinize emin misiniz?
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

export default Cases;
