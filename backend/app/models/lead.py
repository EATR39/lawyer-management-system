# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Potansiyel İş Modeli
Lead (potansiyel müvekkil) veritabanı modelini tanımlar.
"""

from datetime import datetime
from app import db


class Lead(db.Model):
    """
    Potansiyel iş/müvekkil modeli
    
    Attributes:
        id: Benzersiz lead kimliği
        name: Ad soyad
        contact_info: İletişim bilgileri
        case_type: Potansiyel dava tipi
        description: Açıklama
        source: Kaynak
        status: Durum
        estimated_value: Tahmini değer
        follow_up_date: Takip tarihi
        converted_to_client_id: Dönüştürülen müvekkil ID'si
        notes: Notlar
        created_at: Oluşturulma tarihi
        updated_at: Güncellenme tarihi
    """
    
    __tablename__ = 'leads'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    contact_info = db.Column(db.String(200))
    case_type = db.Column(db.String(50))
    description = db.Column(db.Text)
    source = db.Column(db.String(50))
    status = db.Column(db.String(20), default='new')
    estimated_value = db.Column(db.Numeric(15, 2))
    follow_up_date = db.Column(db.Date)
    converted_to_client_id = db.Column(db.Integer, db.ForeignKey('clients.id'))
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    converted_client = db.relationship('Client', foreign_keys=[converted_to_client_id])
    creator = db.relationship('User', foreign_keys=[created_by])
    
    # Durumlar
    STATUSES = {
        'new': 'Yeni',
        'contacted': 'İletişime Geçildi',
        'qualified': 'Nitelikli',
        'proposal': 'Teklif Verildi',
        'negotiation': 'Müzakere',
        'converted': 'Dönüştürüldü',
        'lost': 'Kaybedildi'
    }
    
    # Kaynaklar
    SOURCES = {
        'referral': 'Referans',
        'website': 'Web Sitesi',
        'social_media': 'Sosyal Medya',
        'advertisement': 'Reklam',
        'walk_in': 'Ofise Gelen',
        'phone': 'Telefon',
        'other': 'Diğer'
    }
    
    @property
    def status_display(self):
        """Durum görüntü adını döndürür"""
        return self.STATUSES.get(self.status, self.status)
    
    @property
    def source_display(self):
        """Kaynak görüntü adını döndürür"""
        return self.SOURCES.get(self.source, self.source)
    
    @property
    def is_converted(self):
        """Müvekkile dönüştürülüp dönüştürülmediğini kontrol eder"""
        return self.status == 'converted' and self.converted_to_client_id is not None
    
    @property
    def needs_follow_up(self):
        """Takip gerekip gerekmediğini kontrol eder"""
        if not self.follow_up_date or self.status in ['converted', 'lost']:
            return False
        return self.follow_up_date <= datetime.utcnow().date()
    
    def to_dict(self, include_relations=False):
        """Model'i sözlük olarak döndürür"""
        data = {
            'id': self.id,
            'name': self.name,
            'contact_info': self.contact_info,
            'case_type': self.case_type,
            'description': self.description,
            'source': self.source,
            'source_display': self.source_display,
            'status': self.status,
            'status_display': self.status_display,
            'estimated_value': float(self.estimated_value) if self.estimated_value else None,
            'follow_up_date': self.follow_up_date.isoformat() if self.follow_up_date else None,
            'converted_to_client_id': self.converted_to_client_id,
            'is_converted': self.is_converted,
            'needs_follow_up': self.needs_follow_up,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relations:
            data['converted_client'] = self.converted_client.to_dict() if self.converted_client else None
            data['creator'] = self.creator.to_dict() if self.creator else None
        
        return data
    
    def __repr__(self):
        return f'<Lead {self.name}>'
