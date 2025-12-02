/**
 * Avukat Yönetim Sistemi - Şablonlar Sayfası
 * Belge şablonları yönetimi
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  ContentCopy,
  Article
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { apiService } from '../services/api';

// Validasyon şeması
const validationSchema = Yup.object({
  name: Yup.string().required('Şablon adı gereklidir'),
  template_type: Yup.string().required('Şablon tipi gereklidir'),
  content: Yup.string().required('İçerik gereklidir')
});

/**
 * Şablonlar sayfası bileşeni
 */
const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Şablon tipleri
  const templateTypes = {
    petition: 'Dilekçe',
    contract: 'Sözleşme',
    power_of_attorney: 'Vekaletname',
    letter: 'Mektup',
    invoice: 'Fatura',
    other: 'Diğer'
  };

  // Kategoriler
  const categories = {
    criminal: 'Ceza Hukuku',
    civil: 'Medeni Hukuk',
    family: 'Aile Hukuku',
    labor: 'İş Hukuku',
    commercial: 'Ticaret Hukuku',
    administrative: 'İdare Hukuku',
    general: 'Genel'
  };

  // Şablonları yükle
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getTemplates({
        per_page: 100,
        search
      });
      setTemplates(response.data.templates);
    } catch (err) {
      setError('Şablonlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Formik
  const formik = useFormik({
    initialValues: {
      name: '',
      template_type: 'petition',
      content: '',
      variables: [],
      category: 'general',
      is_public: true
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        // Variables'ı parse et
        const variablesText = values.variables;
        const variablesList = typeof variablesText === 'string' 
          ? variablesText.split(',').map(v => v.trim()).filter(v => v)
          : variablesText;
        
        const submitValues = {
          ...values,
          variables: variablesList
        };

        if (editingTemplate) {
          await apiService.updateTemplate(editingTemplate.id, submitValues);
        } else {
          await apiService.createTemplate(submitValues);
        }
        resetForm();
        setDialogOpen(false);
        setEditingTemplate(null);
        loadTemplates();
      } catch (err) {
        setError(err.response?.data?.message || 'İşlem başarısız');
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Dialog aç
  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      formik.setValues({
        name: template.name || '',
        template_type: template.template_type || 'petition',
        content: template.content || '',
        variables: Array.isArray(template.variables) ? template.variables.join(', ') : '',
        category: template.category || 'general',
        is_public: template.is_public !== false
      });
    } else {
      setEditingTemplate(null);
      formik.resetForm();
    }
    setDialogOpen(true);
  };

  // Silme
  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      await apiService.deleteTemplate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      loadTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  // İçeriği kopyala
  const handleCopy = async (template) => {
    try {
      await navigator.clipboard.writeText(template.content);
      // Başarı mesajı gösterilebilir
    } catch (err) {
      console.error('Kopyalama hatası:', err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Şablonlar
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Şablon
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Şablon ara..."
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Şablon bulunamadı
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Article color="primary" />
                      <Typography variant="h6" fontWeight={600}>
                        {template.name}
                      </Typography>
                    </Box>
                    <Box>
                      <Tooltip title="Kopyala">
                        <IconButton size="small" onClick={() => handleCopy(template)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Düzenle">
                        <IconButton size="small" onClick={() => handleOpenDialog(template)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => {
                            setTemplateToDelete(template);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label={template.template_type_display} size="small" color="primary" variant="outlined" />
                    {template.category && (
                      <Chip label={template.category_display} size="small" variant="outlined" />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {template.content}
                  </Typography>

                  {template.variables?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Değişkenler: {template.variables.join(', ')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Ekleme/Düzenleme Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="Şablon Adı"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="template_type"
                  label="Şablon Tipi"
                  value={formik.values.template_type}
                  onChange={formik.handleChange}
                >
                  {Object.entries(templateTypes).map(([key, value]) => (
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
                  name="category"
                  label="Kategori"
                  value={formik.values.category}
                  onChange={formik.handleChange}
                >
                  {Object.entries(categories).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="content"
                  label="İçerik"
                  multiline
                  rows={10}
                  value={formik.values.content}
                  onChange={formik.handleChange}
                  error={formik.touched.content && Boolean(formik.errors.content)}
                  helperText={formik.touched.content && formik.errors.content || 'Değişkenler için {{değişken_adı}} formatını kullanın'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="variables"
                  label="Değişkenler"
                  value={formik.values.variables}
                  onChange={formik.handleChange}
                  helperText="Virgülle ayırarak girin (örn: ad, soyad, tarih)"
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
        <DialogTitle>Şablonu Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{templateToDelete?.name}" şablonunu silmek istediğinize emin misiniz?
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

export default Templates;
