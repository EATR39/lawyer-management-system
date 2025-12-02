/**
 * Avukat Yönetim Sistemi - Potansiyel İşler (Leads) Sayfası
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
  PersonAdd
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { apiService } from '../services/api';

// Validasyon şeması
const validationSchema = Yup.object({
  name: Yup.string().required('İsim gereklidir')
});

// Durum renkleri
const statusColors = {
  new: 'info',
  contacted: 'primary',
  qualified: 'secondary',
  proposal: 'warning',
  negotiation: 'warning',
  converted: 'success',
  lost: 'error'
};

/**
 * Leads sayfası bileşeni
 */
const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState(null);

  // Durumlar
  const statuses = {
    new: 'Yeni',
    contacted: 'İletişime Geçildi',
    qualified: 'Nitelikli',
    proposal: 'Teklif Verildi',
    negotiation: 'Müzakere',
    converted: 'Dönüştürüldü',
    lost: 'Kaybedildi'
  };

  // Kaynaklar
  const sources = {
    referral: 'Referans',
    website: 'Web Sitesi',
    social_media: 'Sosyal Medya',
    advertisement: 'Reklam',
    walk_in: 'Ofise Gelen',
    phone: 'Telefon',
    other: 'Diğer'
  };

  // Leadleri yükle
  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getLeads({
        page: page + 1,
        per_page: rowsPerPage,
        search
      });
      setLeads(response.data.leads);
      setTotal(response.data.total);
    } catch (err) {
      setError('Leadler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Formik
  const formik = useFormik({
    initialValues: {
      name: '',
      contact_info: '',
      case_type: '',
      description: '',
      source: '',
      status: 'new',
      estimated_value: '',
      follow_up_date: '',
      notes: ''
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (editingLead) {
          await apiService.updateLead(editingLead.id, values);
        } else {
          await apiService.createLead(values);
        }
        resetForm();
        setDialogOpen(false);
        setEditingLead(null);
        loadLeads();
      } catch (err) {
        setError(err.response?.data?.message || 'İşlem başarısız');
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Dialog aç
  const handleOpenDialog = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      formik.setValues({
        name: lead.name || '',
        contact_info: lead.contact_info || '',
        case_type: lead.case_type || '',
        description: lead.description || '',
        source: lead.source || '',
        status: lead.status || 'new',
        estimated_value: lead.estimated_value || '',
        follow_up_date: lead.follow_up_date || '',
        notes: lead.notes || ''
      });
    } else {
      setEditingLead(null);
      formik.resetForm();
    }
    setDialogOpen(true);
  };

  // Silme
  const handleDelete = async () => {
    if (!leadToDelete) return;
    
    try {
      await apiService.deleteLead(leadToDelete.id);
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
      loadLeads();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  // Müvekkile dönüştür
  const handleConvert = async () => {
    if (!leadToConvert) return;
    
    try {
      await apiService.convertLead(leadToConvert.id);
      setConvertDialogOpen(false);
      setLeadToConvert(null);
      loadLeads();
    } catch (err) {
      setError(err.response?.data?.message || 'Dönüştürme işlemi başarısız');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Potansiyel İşler
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Lead
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
            placeholder="Lead ara..."
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
                <TableCell>İsim</TableCell>
                <TableCell>İletişim</TableCell>
                <TableCell>Kaynak</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Tahmini Değer</TableCell>
                <TableCell>Takip Tarihi</TableCell>
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
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Lead bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id} hover>
                    <TableCell>
                      <Typography fontWeight={500}>{lead.name}</Typography>
                    </TableCell>
                    <TableCell>{lead.contact_info || '-'}</TableCell>
                    <TableCell>{lead.source_display || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={lead.status_display}
                        color={statusColors[lead.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {lead.estimated_value 
                        ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(lead.estimated_value)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {lead.follow_up_date 
                        ? format(new Date(lead.follow_up_date), 'dd.MM.yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {lead.status !== 'converted' && (
                        <Tooltip title="Müvekkile Dönüştür">
                          <IconButton
                            onClick={() => {
                              setLeadToConvert(lead);
                              setConvertDialogOpen(true);
                            }}
                            color="success"
                          >
                            <PersonAdd />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Düzenle">
                        <IconButton onClick={() => handleOpenDialog(lead)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton
                          onClick={() => {
                            setLeadToDelete(lead);
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
            {editingLead ? 'Lead Düzenle' : 'Yeni Lead'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="name"
                  label="İsim"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="contact_info"
                  label="İletişim Bilgisi"
                  value={formik.values.contact_info}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="source"
                  label="Kaynak"
                  value={formik.values.source}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">Seçiniz</MenuItem>
                  {Object.entries(sources).map(([key, value]) => (
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
                  name="estimated_value"
                  label="Tahmini Değer (TL)"
                  type="number"
                  value={formik.values.estimated_value}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="follow_up_date"
                  label="Takip Tarihi"
                  type="date"
                  value={formik.values.follow_up_date}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="notes"
                  label="Notlar"
                  multiline
                  rows={2}
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
        <DialogTitle>Lead Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{leadToDelete?.name}" adlı lead'i silmek istediğinize emin misiniz?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dönüştürme Dialog */}
      <Dialog open={convertDialogOpen} onClose={() => setConvertDialogOpen(false)}>
        <DialogTitle>Müvekkile Dönüştür</DialogTitle>
        <DialogContent>
          <Typography>
            "{leadToConvert?.name}" adlı lead'i müvekkile dönüştürmek istediğinize emin misiniz?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertDialogOpen(false)}>İptal</Button>
          <Button onClick={handleConvert} color="success" variant="contained">
            Dönüştür
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Leads;
