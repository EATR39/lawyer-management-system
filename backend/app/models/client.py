# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Müvekkil Modeli
Müvekkil veritabanı modelini tanımlar.
"""

from datetime import datetime
from app import db


class Client(db.Model):
    """
    Müvekkil modeli
    
    Attributes:
        id: Benzersiz müvekkil kimliği
        tc_no: TC Kimlik Numarası
        name: Müvekkil adı
        surname: Müvekkil soyadı
        email: E-posta adresi
        phone: Telefon numarası
        address: Adres
        birth_date: Doğum tarihi
        occupation: Meslek
        notes: Notlar
        status: Müvekkil durumu (active, passive, potential)
        created_by: Oluşturan kullanıcı ID'si
        created_at: Oluşturulma tarihi
        updated_at: Güncellenme tarihi
    """
    
    __tablename__ = 'clients'
    
    id = db.Column(db.Integer, primary_key=True)
    tc_no = db.Column(db.String(11), unique=True, index=True)
    name = db.Column(db.String(50), nullable=False)
    surname = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), index=True)
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    birth_date = db.Column(db.Date)
    occupation = db.Column(db.String(100))
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='active')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    cases = db.relationship('Case', backref='client', lazy='dynamic')
    transactions = db.relationship('Transaction', backref='client', lazy='dynamic')
    documents = db.relationship('Document', 
                               primaryjoin="and_(Document.related_to=='client', foreign(Document.related_id)==Client.id)",
                               lazy='dynamic',
                               viewonly=True)
    
    # Durumlar
    STATUSES = {
        'active': 'Aktif',
        'passive': 'Pasif',
        'potential': 'Potansiyel'
    }
    
    @property
    def full_name(self):
        """Tam adı döndürür"""
        return f"{self.name} {self.surname}"
    
    @property
    def status_display(self):
        """Durum görüntü adını döndürür"""
        return self.STATUSES.get(self.status, self.status)
    
    @property
    def active_cases_count(self):
        """Aktif dava sayısını döndürür"""
        from app.models.case import Case
        return self.cases.filter(Case.status.in_(['open', 'pending', 'in_progress'])).count()
    
    @property
    def total_debt(self):
        """Toplam borç miktarını döndürür"""
        from app.models.transaction import Transaction
        income = self.transactions.filter_by(transaction_type='income', status='paid').with_entities(
            db.func.sum(Transaction.amount)
        ).scalar() or 0
        
        expected = self.transactions.filter_by(transaction_type='income').with_entities(
            db.func.sum(Transaction.amount)
        ).scalar() or 0
        
        return expected - income
    
    def to_dict(self, include_relations=False):
        """Model'i sözlük olarak döndürür"""
        data = {
            'id': self.id,
            'tc_no': self.tc_no,
            'name': self.name,
            'surname': self.surname,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'occupation': self.occupation,
            'notes': self.notes,
            'status': self.status,
            'status_display': self.status_display,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relations:
            data['active_cases_count'] = self.active_cases_count
            data['total_debt'] = float(self.total_debt) if self.total_debt else 0
        
        return data
    
    def __repr__(self):
        return f'<Client {self.full_name}>'
