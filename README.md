# Avukat Yönetim Sistemi (Lawyer Management System)

Modern, estetik ve tam özellikli bir avukat yönetim sistemi. Sistem localhost üzerinde çalışır, web tabanlıdır ve internet bağlantısı gerektirmez.

## 🏗️ Teknoloji Stack

### Backend
- **Python 3.9+** ve **Flask**
- **SQLAlchemy** ORM
- **SQLite** veritabanı
- **Flask-JWT-Extended** (kimlik doğrulama)
- **Flask-CORS** (CORS desteği)
- **Flask-Migrate** (veritabanı migrasyonları)
- **APScheduler** (otomatik yedekleme)

### Frontend
- **React 18+** (Hooks, Context API)
- **Material-UI (MUI) v5** - Modern, temiz tasarım
- **React Router v6** - Routing
- **Axios** - API istekleri
- **Formik + Yup** - Form yönetimi ve validasyon
- **Recharts** - Grafikler
- **date-fns** - Tarih işlemleri
- **React-Dropzone** - Dosya yükleme

## 🎨 Tema Sistemi

3 Hazır Tema:
1. **Professional Blue** (Varsayılan - Mavi tonları)
2. **Dark Mode** (Koyu mod - Gri/siyah)
3. **Elegant Purple** (Mor tonları)

## 🚀 Kurulum

### Backend Kurulumu

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python run.py
```

Backend http://localhost:5000 adresinde çalışacaktır.

### Frontend Kurulumu

```bash
cd frontend
npm install
npm start
```

Frontend http://localhost:3000 adresinde çalışacaktır.

## 🔐 Varsayılan Giriş Bilgileri

- **Email:** admin@lawyer.local
- **Password:** admin123

## 📋 Özellikler

### Müvekkil Yönetimi
- Müvekkil ekleme, düzenleme, silme
- TC kimlik no, iletişim bilgileri, adres yönetimi
- Müvekkil durum takibi

### Dava Yönetimi
- Dava ekleme ve takibi
- Duruşma tarihi yönetimi
- Dava durumu takibi (Devam Ediyor, Kazanıldı, Kaybedildi, vb.)
- Karşı taraf bilgileri

### Finansal Yönetim
- Gelir/Gider takibi
- Taksit yönetimi
- Ödeme durumu takibi
- Finansal raporlar

### Potansiyel İşler (Leads)
- Potansiyel müvekkil takibi
- Müvekkile dönüştürme
- Takip tarihi hatırlatmaları

### Belge Yönetimi
- Dosya yükleme/indirme
- Belge kategorileri
- Dava ve müvekkile bağlı belgeler

### Takvim
- Duruşma tarihleri
- Toplantı planlaması
- Hatırlatmalar

### Şablonlar
- Belge şablonları
- Değişken desteği
- Şablon kategorileri

### Dashboard
- Genel istatistikler
- Yaklaşan duruşmalar
- Finansal özet
- Grafikler

## 👥 Kullanıcı Rolleri

1. **Admin** - Tam yetki
2. **Avukat** - Dava ve müvekkil yönetimi
3. **Sekreter** - Temel işlemler
4. **Stajyer** - Sınırlı erişim

## 📁 Proje Yapısı

```
lawyer-management-system/
├── backend/
│   ├── app/
│   │   ├── models/          # Veritabanı modelleri
│   │   ├── routes/          # API endpoint'leri
│   │   ├── services/        # İş mantığı servisleri
│   │   └── utils/           # Yardımcı fonksiyonlar
│   ├── uploads/             # Yüklenen dosyalar
│   ├── backups/             # Veritabanı yedekleri
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # React bileşenleri
│   │   ├── contexts/        # Context API
│   │   ├── pages/           # Sayfa bileşenleri
│   │   ├── services/        # API servisleri
│   │   └── themes/          # Tema tanımları
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Kimlik Doğrulama
- `POST /api/auth/login` - Giriş
- `POST /api/auth/logout` - Çıkış
- `POST /api/auth/refresh` - Token yenileme
- `GET /api/auth/me` - Mevcut kullanıcı bilgisi

### Müvekkiller
- `GET /api/clients` - Liste (arama, filtreleme, pagination)
- `GET /api/clients/:id` - Detay
- `POST /api/clients` - Oluştur
- `PUT /api/clients/:id` - Güncelle
- `DELETE /api/clients/:id` - Sil

### Davalar
- `GET /api/cases` - Liste
- `GET /api/cases/:id` - Detay
- `POST /api/cases` - Oluştur
- `PUT /api/cases/:id` - Güncelle
- `DELETE /api/cases/:id` - Sil

### Finans
- `GET /api/transactions` - Liste
- `GET /api/transactions/:id` - Detay
- `POST /api/transactions` - Oluştur
- `PUT /api/transactions/:id` - Güncelle
- `DELETE /api/transactions/:id` - Sil
- `GET /api/transactions/report` - Rapor

### Potansiyel İşler
- `GET /api/leads` - Liste
- `POST /api/leads` - Oluştur
- `PUT /api/leads/:id` - Güncelle
- `DELETE /api/leads/:id` - Sil
- `POST /api/leads/:id/convert` - Müvekkile dönüştür

### Belgeler
- `GET /api/documents` - Liste
- `POST /api/documents/upload` - Yükle
- `GET /api/documents/:id/download` - İndir
- `DELETE /api/documents/:id` - Sil

### Takvim
- `GET /api/calendar/events` - Liste
- `POST /api/calendar/events` - Oluştur
- `PUT /api/calendar/events/:id` - Güncelle
- `DELETE /api/calendar/events/:id` - Sil
- `GET /api/calendar/upcoming` - Yaklaşan etkinlikler

### Dashboard
- `GET /api/dashboard/stats` - İstatistikler ve grafikler

### Kullanıcılar
- `GET /api/users` - Liste (Admin only)
- `POST /api/users` - Oluştur (Admin only)
- `PUT /api/users/:id` - Güncelle
- `DELETE /api/users/:id` - Sil (Admin only)

## 🔐 Güvenlik

- **Şifre Hashleme:** bcrypt
- **JWT Token:** Access token (1 saat) + Refresh token (30 gün)
- **CORS:** Sadece localhost için
- **Input Validation:** Backend ve frontend
- **SQL Injection Koruması:** SQLAlchemy ORM kullanımı
- **File Upload Security:** Dosya tipi ve boyut kontrolü

## 📝 Lisans

MIT License