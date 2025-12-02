/**
 * Avukat Yönetim Sistemi - Ayarlar Sayfası
 * Kullanıcı profili ve uygulama ayarları
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Alert,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Profil validasyon şeması
const profileSchema = Yup.object({
  name: Yup.string().required('Ad gereklidir'),
  surname: Yup.string().required('Soyad gereklidir'),
  phone: Yup.string()
});

// Şifre validasyon şeması
const passwordSchema = Yup.object({
  current_password: Yup.string().required('Mevcut şifre gereklidir'),
  new_password: Yup.string().min(6, 'Şifre en az 6 karakter olmalıdır').required('Yeni şifre gereklidir'),
  confirm_password: Yup.string()
    .oneOf([Yup.ref('new_password'), null], 'Şifreler eşleşmiyor')
    .required('Şifre onayı gereklidir')
});

/**
 * Ayarlar sayfası bileşeni
 */
const Settings = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const { themeName, availableThemes, changeTheme } = useTheme();
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Profil formu
  const profileFormik = useFormik({
    initialValues: {
      name: user?.name || '',
      surname: user?.surname || '',
      phone: user?.phone || ''
    },
    validationSchema: profileSchema,
    onSubmit: async (values, { setSubmitting }) => {
      const result = await updateProfile(values);
      if (result.success) {
        setProfileMessage({ type: 'success', text: 'Profil başarıyla güncellendi' });
      } else {
        setProfileMessage({ type: 'error', text: result.error });
      }
      setSubmitting(false);
    }
  });

  // Şifre formu
  const passwordFormik = useFormik({
    initialValues: {
      current_password: '',
      new_password: '',
      confirm_password: ''
    },
    validationSchema: passwordSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      const result = await changePassword(values.current_password, values.new_password);
      if (result.success) {
        setPasswordMessage({ type: 'success', text: 'Şifre başarıyla değiştirildi' });
        resetForm();
      } else {
        setPasswordMessage({ type: 'error', text: result.error });
      }
      setSubmitting(false);
    }
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Ayarlar
      </Typography>

      <Grid container spacing={3}>
        {/* Profil Bilgileri */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={500} gutterBottom>
                Profil Bilgileri
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {profileMessage.text && (
                <Alert 
                  severity={profileMessage.type} 
                  sx={{ mb: 2 }}
                  onClose={() => setProfileMessage({ type: '', text: '' })}
                >
                  {profileMessage.text}
                </Alert>
              )}

              <form onSubmit={profileFormik.handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="name"
                      label="Ad"
                      value={profileFormik.values.name}
                      onChange={profileFormik.handleChange}
                      error={profileFormik.touched.name && Boolean(profileFormik.errors.name)}
                      helperText={profileFormik.touched.name && profileFormik.errors.name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="surname"
                      label="Soyad"
                      value={profileFormik.values.surname}
                      onChange={profileFormik.handleChange}
                      error={profileFormik.touched.surname && Boolean(profileFormik.errors.surname)}
                      helperText={profileFormik.touched.surname && profileFormik.errors.surname}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="phone"
                      label="Telefon"
                      value={profileFormik.values.phone}
                      onChange={profileFormik.handleChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="E-posta"
                      value={user?.email || ''}
                      disabled
                      helperText="E-posta adresi değiştirilemez"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Rol"
                      value={user?.role_display || ''}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={profileFormik.isSubmitting}
                    >
                      {profileFormik.isSubmitting ? <CircularProgress size={24} /> : 'Profili Güncelle'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Şifre Değiştir */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={500} gutterBottom>
                Şifre Değiştir
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {passwordMessage.text && (
                <Alert 
                  severity={passwordMessage.type} 
                  sx={{ mb: 2 }}
                  onClose={() => setPasswordMessage({ type: '', text: '' })}
                >
                  {passwordMessage.text}
                </Alert>
              )}

              <form onSubmit={passwordFormik.handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="password"
                      name="current_password"
                      label="Mevcut Şifre"
                      value={passwordFormik.values.current_password}
                      onChange={passwordFormik.handleChange}
                      error={passwordFormik.touched.current_password && Boolean(passwordFormik.errors.current_password)}
                      helperText={passwordFormik.touched.current_password && passwordFormik.errors.current_password}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="password"
                      name="new_password"
                      label="Yeni Şifre"
                      value={passwordFormik.values.new_password}
                      onChange={passwordFormik.handleChange}
                      error={passwordFormik.touched.new_password && Boolean(passwordFormik.errors.new_password)}
                      helperText={passwordFormik.touched.new_password && passwordFormik.errors.new_password}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="password"
                      name="confirm_password"
                      label="Yeni Şifre (Tekrar)"
                      value={passwordFormik.values.confirm_password}
                      onChange={passwordFormik.handleChange}
                      error={passwordFormik.touched.confirm_password && Boolean(passwordFormik.errors.confirm_password)}
                      helperText={passwordFormik.touched.confirm_password && passwordFormik.errors.confirm_password}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="secondary"
                      disabled={passwordFormik.isSubmitting}
                    >
                      {passwordFormik.isSubmitting ? <CircularProgress size={24} /> : 'Şifreyi Değiştir'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Tema Ayarları */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={500} gutterBottom>
                Görünüm
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <FormControl fullWidth>
                <InputLabel>Tema</InputLabel>
                <Select
                  value={themeName}
                  label="Tema"
                  onChange={(e) => changeTheme(e.target.value)}
                >
                  {availableThemes.map((theme) => (
                    <MenuItem key={theme.key} value={theme.key}>
                      {theme.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Tema tercihiniz tarayıcınızda saklanır ve tüm oturumlarda geçerli olur.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Uygulama Bilgileri */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={500} gutterBottom>
                Uygulama Bilgileri
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Uygulama:</strong> Avukat Yönetim Sistemi
                </Typography>
                <Typography variant="body2">
                  <strong>Versiyon:</strong> 1.0.0
                </Typography>
                <Typography variant="body2">
                  <strong>Teknoloji:</strong> React + Material-UI + Flask
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Bu uygulama localhost üzerinde çalışmaktadır ve internet bağlantısı gerektirmez.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
