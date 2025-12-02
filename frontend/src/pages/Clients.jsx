/**
 * Avukat Yönetim Sistemi - Müvekkiller Sayfası
 * Müvekkil listesi ve CRUD işlemleri
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
  Visibility,
  Phone,
  Email
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { apiService } from '../services/api';

// Validasyon şeması
const validationSchema = Yup.object({
  name: Yup.string().required('Ad gereklidir'),
  surname: Yup.string().required('Soyad gereklidir'),
  tc_no: Yup.string()
    .matches(/^[0-9]{11}$/, 'TC kimlik numarası 11 haneli olmalıdır')
    .nullable(),
  email: Yup.string().email('Geçerli bir e-posta giriniz').nullable(),
  phone: Yup.string().nullable()
});

// Durum renkleri
const statusColors = {
  active: 'success',
  passive: 'default',
  potential: 'warning'
};

/**
 * Müvekkiller sayfası bileşeni
 */
const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  // Müvekkilleri yükle
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getClients({
        page: page + 1,
        per_page: rowsPerPage,
        search
      });
      setClients(response.data.clients);
      setTotal(response.data.total);
    } catch (err) {
      setError('Müvekkiller yüklenemedi');
      console.error('Load clients error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Formik
  const formik = useFormik({
    initialValues: {
      name: '',
      surname: '',
      tc_no: '',
      email: '',
      phone: '',
      address: '',
      occupation: '',
      notes: '',
      status: 'active'
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (editingClient) {
          await apiService.updateClient(editingClient.id, values);
        } else {
          await apiService.createClient(values);
        }
        resetForm();
        setDialogOpen(false);
        setEditingClient(null);
        loadClients();
      } catch (err) {
        setError(err.response?.data?.message || 'İşlem başarısız');
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Dialog aç
  const handleOpenDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      formik.setValues({
        name: client.name || '',
        surname: client.surname || '',
        tc_no: client.tc_no || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        occupation: client.occupation || '',
        notes: client.notes || '',
        status: client.status || 'active'
      });
    } else {
      setEditingClient(null);
      formik.resetForm();
    }
    setDialogOpen(true);
  };

  // Silme
  const handleDelete = async () => {
    if (!clientToDelete) return;
    
    try {
      await apiService.deleteClient(clientToDelete.id);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      loadClients();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Müvekkiller
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Müvekkil
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        {/* Arama */}
        <Box sx={{ p: 2 }}>
          <TextField
            placeholder="Müvekkil ara..."
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

        {/* Tablo */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ad Soyad</TableCell>
                <TableCell>TC Kimlik No</TableCell>
                <TableCell>İletişim</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Aktif Dava</TableCell>
                <TableCell>Kayıt Tarihi</TableCell>
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
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Müvekkil bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} hover>
                    <TableCell>
                      <Typography fontWeight={500}>
                        {client.full_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{client.tc_no || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {client.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Phone fontSize="small" color="action" />
                            <Typography variant="body2">{client.phone}</Typography>
                          </Box>
                        )}
                        {client.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Email fontSize="small" color="action" />
                            <Typography variant="body2">{client.email}</Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={client.status_display}
                        color={statusColors[client.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{client.active_cases_count || 0}</TableCell>
                    <TableCell>
                      {client.created_at ? format(new Date(client.created_at), 'dd.MM.yyyy') : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Düzenle">
                        <IconButton onClick={() => handleOpenDialog(client)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton
                          onClick={() => {
                            setClientToDelete(client);
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
            {editingClient ? 'Müvekkil Düzenle' : 'Yeni Müvekkil'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="name"
                  label="Ad"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="surname"
                  label="Soyad"
                  value={formik.values.surname}
                  onChange={formik.handleChange}
                  error={formik.touched.surname && Boolean(formik.errors.surname)}
                  helperText={formik.touched.surname && formik.errors.surname}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="tc_no"
                  label="TC Kimlik No"
                  value={formik.values.tc_no}
                  onChange={formik.handleChange}
                  error={formik.touched.tc_no && Boolean(formik.errors.tc_no)}
                  helperText={formik.touched.tc_no && formik.errors.tc_no}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="phone"
                  label="Telefon"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="email"
                  label="E-posta"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="occupation"
                  label="Meslek"
                  value={formik.values.occupation}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="address"
                  label="Adres"
                  multiline
                  rows={2}
                  value={formik.values.address}
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
                  <MenuItem value="active">Aktif</MenuItem>
                  <MenuItem value="passive">Pasif</MenuItem>
                  <MenuItem value="potential">Potansiyel</MenuItem>
                </TextField>
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
        <DialogTitle>Müvekkili Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{clientToDelete?.full_name}" adlı müvekkili silmek istediğinize emin misiniz?
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

export default Clients;
