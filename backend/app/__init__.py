# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Flask App Factory
Bu dosya Flask uygulamasını oluşturur ve yapılandırır.
"""

import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate

# Veritabanı ve JWT nesneleri
db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()


def create_app(config_name=None):
    """
    Flask uygulaması factory fonksiyonu
    
    Args:
        config_name: Yapılandırma adı ('development', 'production', 'testing')
    
    Returns:
        Flask: Yapılandırılmış Flask uygulaması
    """
    # Flask uygulamasını oluştur
    app = Flask(__name__)
    
    # Yapılandırmayı yükle
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    from app.config import config
    app.config.from_object(config[config_name])
    
    # Uzantıları başlat
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # CORS yapılandırması
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    
    # Klasörlerin var olduğundan emin ol
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['BACKUP_FOLDER'], exist_ok=True)
    
    # Modelleri import et
    from app.models import User, Client, Case, Transaction, Installment, Lead, Document, CalendarEvent, Template
    
    # Route'ları kaydet
    from app.routes import auth_bp, clients_bp, cases_bp, finance_bp, leads_bp, documents_bp, calendar_bp, templates_bp, dashboard_bp, users_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(clients_bp, url_prefix='/api/clients')
    app.register_blueprint(cases_bp, url_prefix='/api/cases')
    app.register_blueprint(finance_bp, url_prefix='/api/transactions')
    app.register_blueprint(leads_bp, url_prefix='/api/leads')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(calendar_bp, url_prefix='/api/calendar')
    app.register_blueprint(templates_bp, url_prefix='/api/templates')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    
    # JWT hata işleyicileri
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'message': 'Token süresi dolmuş', 'error': 'token_expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'message': 'Geçersiz token', 'error': 'invalid_token'}, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'message': 'Token bulunamadı', 'error': 'authorization_required'}, 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return {'message': 'Token iptal edilmiş', 'error': 'token_revoked'}, 401
    
    # Veritabanını oluştur ve varsayılan admin kullanıcısını ekle
    with app.app_context():
        db.create_all()
        _create_default_admin()
    
    # Yedekleme servisini başlat
    from app.services.backup_service import init_backup_scheduler
    init_backup_scheduler(app)
    
    return app


def _create_default_admin():
    """Varsayılan admin kullanıcısını oluşturur"""
    from app.models import User
    
    # Admin kullanıcısı zaten var mı kontrol et
    admin = User.query.filter_by(email='admin@lawyer.local').first()
    
    if not admin:
        admin = User(
            email='admin@lawyer.local',
            name='Admin',
            surname='User',
            role='admin',
            is_active=True
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print('Varsayılan admin kullanıcısı oluşturuldu: admin@lawyer.local / admin123')
