/**
 * Avukat Yönetim Sistemi - Belgeler Sayfası
 * Dosya yükleme ve yönetimi
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
  CloudUpload,
  Search,
  Download,
  Delete,
  Description,
  PictureAsPdf,
  Image
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { apiService } from '../services/api';

// Dosya tipi ikonları
const getFileIcon = (mimeType) => {
  if (mimeType?.includes('pdf')) return <PictureAsPdf color="error" />;
  if (mimeType?.includes('image')) return <Image color="primary" />;
  return <Description color="action" />;
};

/**
 * Belgeler sayfası bileşeni
 */
const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    document_type: 'other',
    related_to: '',
    related_id: '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Belge tipleri
  const documentTypes = {
    petition: 'Dilekçe',
    contract: 'Sözleşme',
    court_decision: 'Mahkeme Kararı',
    evidence: 'Delil',
    correspondence: 'Yazışma',
    power_of_attorney: 'Vekaletname',
    identity: 'Kimlik Belgesi',
    invoice: 'Fatura',
    other: 'Diğer'
  };

  // Belgeleri yükle
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getDocuments({
        page: page + 1,
        per_page: rowsPerPage,
        search
      });
      setDocuments(response.data.documents);
      setTotal(response.data.total);
    } catch (err) {
      setError('Belgeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

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
    loadDocuments();
    loadRelatedData();
  }, [loadDocuments]);

  // Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
      }
    },
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
      'text/plain': ['.txt']
    }
  });

  // Dosya yükleme
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', uploadForm.document_type);
      if (uploadForm.related_to) formData.append('related_to', uploadForm.related_to);
      if (uploadForm.related_id) formData.append('related_id', uploadForm.related_id);
      if (uploadForm.description) formData.append('description', uploadForm.description);

      await apiService.uploadDocument(formData);
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({
        document_type: 'other',
        related_to: '',
        related_id: '',
        description: ''
      });
      loadDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  // Dosya indirme
  const handleDownload = async (doc) => {
    try {
      const response = await apiService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('İndirme başarısız');
    }
  };

  // Silme
  const handleDelete = async () => {
    if (!documentToDelete) return;
    
    try {
      await apiService.deleteDocument(documentToDelete.id);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      loadDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Belgeler
        </Typography>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Dosya Yükle
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
            placeholder="Belge ara..."
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
                <TableCell>Dosya</TableCell>
                <TableCell>Tip</TableCell>
                <TableCell>Boyut</TableCell>
                <TableCell>İlişkili</TableCell>
                <TableCell>Yüklenme Tarihi</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Belge bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getFileIcon(doc.mime_type)}
                        <Typography fontWeight={500}>
                          {doc.original_filename}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={doc.document_type_display} size="small" />
                    </TableCell>
                    <TableCell>{doc.file_size_display}</TableCell>
                    <TableCell>
                      {doc.related_to 
                        ? `${doc.related_to === 'client' ? 'Müvekkil' : 'Dava'} #${doc.related_id}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {doc.created_at ? format(new Date(doc.created_at), 'dd.MM.yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="İndir">
                        <IconButton onClick={() => handleDownload(doc)}>
                          <Download />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton
                          onClick={() => {
                            setDocumentToDelete(doc);
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

      {/* Yükleme Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dosya Yükle</DialogTitle>
        <DialogContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              mt: 2
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: 'action.active', mb: 2 }} />
            {selectedFile ? (
              <Typography>{selectedFile.name}</Typography>
            ) : (
              <Typography color="text.secondary">
                Dosyayı buraya sürükleyin veya seçmek için tıklayın
              </Typography>
            )}
          </Box>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Belge Tipi"
                value={uploadForm.document_type}
                onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
              >
                {Object.entries(documentTypes).map(([key, value]) => (
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
                label="İlişki Türü"
                value={uploadForm.related_to}
                onChange={(e) => setUploadForm({ ...uploadForm, related_to: e.target.value, related_id: '' })}
              >
                <MenuItem value="">Seçiniz</MenuItem>
                <MenuItem value="client">Müvekkil</MenuItem>
                <MenuItem value="case">Dava</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={uploadForm.related_to === 'client' ? 'Müvekkil' : 'Dava'}
                value={uploadForm.related_id}
                onChange={(e) => setUploadForm({ ...uploadForm, related_id: e.target.value })}
                disabled={!uploadForm.related_to}
              >
                <MenuItem value="">Seçiniz</MenuItem>
                {uploadForm.related_to === 'client' && clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>
                ))}
                {uploadForm.related_to === 'case' && cases.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.case_number}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                multiline
                rows={2}
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>İptal</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!selectedFile || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'Yükle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Belgeyi Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{documentToDelete?.original_filename}" dosyasını silmek istediğinize emin misiniz?
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

export default Documents;
