/**
 * Avukat Yönetim Sistemi - Takvim Sayfası
 * Etkinlik ve randevu yönetimi
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Event,
  Gavel,
  People,
  Schedule,
  LocationOn
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { apiService } from '../services/api';

// Validasyon şeması
const validationSchema = Yup.object({
  title: Yup.string().required('Başlık gereklidir'),
  event_type: Yup.string().required('Etkinlik tipi gereklidir'),
  start_datetime: Yup.string().required('Başlangıç tarihi gereklidir')
});

// Etkinlik tipi renkleri
const eventTypeColors = {
  hearing: 'error',
  meeting: 'primary',
  deadline: 'warning',
  appointment: 'info',
  reminder: 'secondary',
  other: 'default'
};

// Etkinlik tipi ikonları
const getEventIcon = (type) => {
  switch (type) {
    case 'hearing': return <Gavel />;
    case 'meeting': return <People />;
    default: return <Event />;
  }
};

/**
 * Takvim sayfası bileşeni
 */
const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  // Etkinlik tipleri
  const eventTypes = {
    hearing: 'Duruşma',
    meeting: 'Toplantı',
    deadline: 'Son Tarih',
    appointment: 'Randevu',
    reminder: 'Hatırlatma',
    other: 'Diğer'
  };

  // Durumlar
  const statuses = {
    scheduled: 'Planlandı',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi',
    postponed: 'Ertelendi'
  };

  // Etkinlikleri yükle
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const response = await apiService.getEvents({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        per_page: 100
      });
      setEvents(response.data.events);
    } catch (err) {
      setError('Etkinlikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // İlişkili verileri yükle
  const loadRelatedData = async () => {
    try {
      const [casesRes, clientsRes] = await Promise.all([
        apiService.getCases({ per_page: 100 }),
        apiService.getClients({ per_page: 100 })
      ]);
      setCases(casesRes.data.cases);
      setClients(clientsRes.data.clients);
    } catch (err) {
      console.error('Related data error:', err);
    }
  };

  useEffect(() => {
    loadEvents();
    loadRelatedData();
  }, [loadEvents]);

  // Formik
  const formik = useFormik({
    initialValues: {
      title: '',
      event_type: 'meeting',
      start_datetime: '',
      end_datetime: '',
      location: '',
      related_to: '',
      related_id: '',
      reminder_time: 60,
      status: 'scheduled',
      description: ''
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (editingEvent) {
          await apiService.updateEvent(editingEvent.id, values);
        } else {
          await apiService.createEvent(values);
        }
        resetForm();
        setDialogOpen(false);
        setEditingEvent(null);
        loadEvents();
      } catch (err) {
        setError(err.response?.data?.message || 'İşlem başarısız');
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Dialog aç
  const handleOpenDialog = (event = null) => {
    if (event) {
      setEditingEvent(event);
      formik.setValues({
        title: event.title || '',
        event_type: event.event_type || 'meeting',
        start_datetime: event.start_datetime 
          ? format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm")
          : '',
        end_datetime: event.end_datetime 
          ? format(new Date(event.end_datetime), "yyyy-MM-dd'T'HH:mm")
          : '',
        location: event.location || '',
        related_to: event.related_to || '',
        related_id: event.related_id || '',
        reminder_time: event.reminder_time || 60,
        status: event.status || 'scheduled',
        description: event.description || ''
      });
    } else {
      setEditingEvent(null);
      formik.resetForm();
    }
    setDialogOpen(true);
  };

  // Silme
  const handleDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      await apiService.deleteEvent(eventToDelete.id);
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      loadEvents();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  // Ay değiştirme
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Etkinlikleri tarihe göre grupla
  const groupedEvents = events.reduce((acc, event) => {
    const date = format(new Date(event.start_datetime), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Takvim
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Etkinlik
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Ay Navigasyonu */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button onClick={handlePrevMonth}>← Önceki Ay</Button>
            <Typography variant="h6">
              {format(currentMonth, 'MMMM yyyy', { locale: tr })}
            </Typography>
            <Button onClick={handleNextMonth}>Sonraki Ay →</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Etkinlik Listesi */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : Object.keys(groupedEvents).length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Bu ay için etkinlik bulunmuyor
            </Typography>
          ) : (
            Object.entries(groupedEvents)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dayEvents]) => (
                <Box key={date} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    {format(new Date(date), 'dd MMMM yyyy, EEEE', { locale: tr })}
                  </Typography>
                  <List disablePadding>
                    {dayEvents.map((event, index) => (
                      <React.Fragment key={event.id}>
                        <ListItem
                          secondaryAction={
                            <Box>
                              <Tooltip title="Düzenle">
                                <IconButton onClick={() => handleOpenDialog(event)}>
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Sil">
                                <IconButton
                                  onClick={() => {
                                    setEventToDelete(event);
                                    setDeleteDialogOpen(true);
                                  }}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }
                        >
                          <ListItemIcon>
                            {getEventIcon(event.event_type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography fontWeight={500}>{event.title}</Typography>
                                <Chip
                                  label={event.event_type_display}
                                  color={eventTypeColors[event.event_type]}
                                  size="small"
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Schedule fontSize="small" />
                                  {format(new Date(event.start_datetime), 'HH:mm')}
                                  {event.end_datetime && ` - ${format(new Date(event.end_datetime), 'HH:mm')}`}
                                </Box>
                                {event.location && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocationOn fontSize="small" />
                                    {event.location}
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < dayEvents.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              ))
          )}
        </CardContent>
      </Card>

      {/* Ekleme/Düzenleme Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {editingEvent ? 'Etkinlik Düzenle' : 'Yeni Etkinlik'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="title"
                  label="Başlık"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  error={formik.touched.title && Boolean(formik.errors.title)}
                  helperText={formik.touched.title && formik.errors.title}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="event_type"
                  label="Etkinlik Tipi"
                  value={formik.values.event_type}
                  onChange={formik.handleChange}
                >
                  {Object.entries(eventTypes).map(([key, value]) => (
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
                  name="start_datetime"
                  label="Başlangıç"
                  type="datetime-local"
                  value={formik.values.start_datetime}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                  error={formik.touched.start_datetime && Boolean(formik.errors.start_datetime)}
                  helperText={formik.touched.start_datetime && formik.errors.start_datetime}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="end_datetime"
                  label="Bitiş"
                  type="datetime-local"
                  value={formik.values.end_datetime}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="location"
                  label="Konum"
                  value={formik.values.location}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="reminder_time"
                  label="Hatırlatma"
                  value={formik.values.reminder_time}
                  onChange={formik.handleChange}
                >
                  <MenuItem value={15}>15 dakika önce</MenuItem>
                  <MenuItem value={30}>30 dakika önce</MenuItem>
                  <MenuItem value={60}>1 saat önce</MenuItem>
                  <MenuItem value={1440}>1 gün önce</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="related_to"
                  label="İlişki Türü"
                  value={formik.values.related_to}
                  onChange={(e) => {
                    formik.handleChange(e);
                    formik.setFieldValue('related_id', '');
                  }}
                >
                  <MenuItem value="">Seçiniz</MenuItem>
                  <MenuItem value="case">Dava</MenuItem>
                  <MenuItem value="client">Müvekkil</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="related_id"
                  label={formik.values.related_to === 'case' ? 'Dava' : 'Müvekkil'}
                  value={formik.values.related_id}
                  onChange={formik.handleChange}
                  disabled={!formik.values.related_to}
                >
                  <MenuItem value="">Seçiniz</MenuItem>
                  {formik.values.related_to === 'case' && cases.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.case_number}</MenuItem>
                  ))}
                  {formik.values.related_to === 'client' && clients.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>
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
        <DialogTitle>Etkinliği Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{eventToDelete?.title}" etkinliğini silmek istediğinize emin misiniz?
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

export default Calendar;
