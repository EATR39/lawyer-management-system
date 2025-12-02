# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Kullanıcı Modeli
Kullanıcı veritabanı modelini tanımlar.
"""

from datetime import datetime
import bcrypt
from app import db


class User(db.Model):
    """
    Kullanıcı modeli
    
    Attributes:
        id: Benzersiz kullanıcı kimliği
        email: E-posta adresi (benzersiz)
        password_hash: Hashlenmiş şifre
        name: Kullanıcı adı
        surname: Kullanıcı soyadı
        role: Kullanıcı rolü (admin, lawyer, secretary, intern)
        phone: Telefon numarası
        is_active: Aktiflik durumu
        created_at: Oluşturulma tarihi
        updated_at: Güncellenme tarihi
    """
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    surname = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='lawyer')
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    clients_created = db.relationship('Client', backref='created_by_user', lazy='dynamic', foreign_keys='Client.created_by')
    cases_assigned = db.relationship('Case', backref='assigned_lawyer', lazy='dynamic', foreign_keys='Case.lawyer_id')
    
    # Roller
    ROLES = {
        'admin': 'Yönetici',
        'lawyer': 'Avukat',
        'secretary': 'Sekreter',
        'intern': 'Stajyer'
    }
    
    def set_password(self, password):
        """Şifreyi hashleyerek saklar"""
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
    
    def check_password(self, password):
        """Şifreyi kontrol eder"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8')
        )
    
    @property
    def full_name(self):
        """Tam adı döndürür"""
        return f"{self.name} {self.surname}"
    
    @property
    def role_display(self):
        """Rol görüntü adını döndürür"""
        return self.ROLES.get(self.role, self.role)
    
    def is_admin(self):
        """Admin kontrolü"""
        return self.role == 'admin'
    
    def can_manage_users(self):
        """Kullanıcı yönetimi yetkisi kontrolü"""
        return self.role == 'admin'
    
    def can_delete_records(self):
        """Kayıt silme yetkisi kontrolü"""
        return self.role in ['admin', 'lawyer']
    
    def to_dict(self):
        """Model'i sözlük olarak döndürür"""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'surname': self.surname,
            'full_name': self.full_name,
            'role': self.role,
            'role_display': self.role_display,
            'phone': self.phone,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<User {self.email}>'
