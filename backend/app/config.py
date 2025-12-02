# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Yapılandırma
Bu dosya uygulama yapılandırmasını içerir.
"""

import os
from datetime import timedelta

# Base directory
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


class Config:
    """Temel yapılandırma sınıfı"""
    
    # Gizli anahtar - üretimde değiştirilmeli
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Veritabanı yapılandırması
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f'sqlite:///{os.path.join(BASE_DIR, "lawyer_management.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Yapılandırması
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # Dosya yükleme yapılandırması
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB maksimum dosya boyutu
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt'}
    
    # Yedekleme yapılandırması
    BACKUP_FOLDER = os.path.join(BASE_DIR, 'backups')
    BACKUP_INTERVAL_HOURS = 24  # 24 saatte bir otomatik yedekleme
    
    # CORS Yapılandırması
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    
    # Sayfalama
    ITEMS_PER_PAGE = 10


class DevelopmentConfig(Config):
    """Geliştirme ortamı yapılandırması"""
    DEBUG = True
    SQLALCHEMY_ECHO = False  # SQL sorgularını logla


class ProductionConfig(Config):
    """Üretim ortamı yapılandırması"""
    DEBUG = False


class TestingConfig(Config):
    """Test ortamı yapılandırması"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


# Yapılandırma eşlemesi
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
