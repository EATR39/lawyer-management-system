# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Dava Modeli
Dava veritabanı modelini tanımlar.
"""

from datetime import datetime
from app import db


class Case(db.Model):
    """
    Dava modeli
    
    Attributes:
        id: Benzersiz dava kimliği
        case_number: Dava numarası
        client_id: Müvekkil ID'si
        lawyer_id: Atanan avukat ID'si
        case_type: Dava tipi
        court_name: Mahkeme adı
        subject: Dava konusu
        opposing_party: Karşı taraf
        status: Dava durumu
        start_date: Başlangıç tarihi
        end_date: Bitiş tarihi
        next_hearing_date: Sonraki duruşma tarihi
        case_value: Dava değeri
        notes: Notlar
        created_at: Oluşturulma tarihi
        updated_at: Güncellenme tarihi
    """
    
    __tablename__ = 'cases'
    
    id = db.Column(db.Integer, primary_key=True)
    case_number = db.Column(db.String(50), unique=True, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    lawyer_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    case_type = db.Column(db.String(50), nullable=False)
    court_name = db.Column(db.String(100))
    subject = db.Column(db.Text, nullable=False)
    opposing_party = db.Column(db.String(200))
    status = db.Column(db.String(20), default='open')
    start_date = db.Column(db.Date, default=datetime.utcnow)
    end_date = db.Column(db.Date)
    next_hearing_date = db.Column(db.DateTime)
    case_value = db.Column(db.Numeric(15, 2))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    transactions = db.relationship('Transaction', backref='case', lazy='dynamic')
    documents = db.relationship('Document',
                               primaryjoin="and_(Document.related_to=='case', foreign(Document.related_id)==Case.id)",
                               lazy='dynamic',
                               viewonly=True)
    calendar_events = db.relationship('CalendarEvent',
                                     primaryjoin="and_(CalendarEvent.related_to=='case', foreign(CalendarEvent.related_id)==Case.id)",
                                     lazy='dynamic',
                                     viewonly=True)
    
    # Dava tipleri
    CASE_TYPES = {
        'criminal': 'Ceza Davası',
        'civil': 'Hukuk Davası',
        'family': 'Aile Davası',
        'labor': 'İş Davası',
        'commercial': 'Ticaret Davası',
        'administrative': 'İdare Davası',
        'tax': 'Vergi Davası',
        'execution': 'İcra Takibi',
        'other': 'Diğer'
    }
    
    # Durumlar
    STATUSES = {
        'open': 'Açık',
        'pending': 'Beklemede',
        'in_progress': 'Devam Ediyor',
        'won': 'Kazanıldı',
        'lost': 'Kaybedildi',
        'settled': 'Uzlaşıldı',
        'closed': 'Kapatıldı',
        'appealed': 'Temyizde'
    }
    
    @property
    def case_type_display(self):
        """Dava tipi görüntü adını döndürür"""
        return self.CASE_TYPES.get(self.case_type, self.case_type)
    
    @property
    def status_display(self):
        """Durum görüntü adını döndürür"""
        return self.STATUSES.get(self.status, self.status)
    
    @property
    def is_active(self):
        """Davanın aktif olup olmadığını döndürür"""
        return self.status in ['open', 'pending', 'in_progress', 'appealed']
    
    @property
    def total_income(self):
        """Toplam geliri döndürür"""
        from app.models.transaction import Transaction
        return self.transactions.filter_by(
            transaction_type='income', 
            status='paid'
        ).with_entities(db.func.sum(Transaction.amount)).scalar() or 0
    
    @property
    def total_expense(self):
        """Toplam gideri döndürür"""
        from app.models.transaction import Transaction
        return self.transactions.filter_by(
            transaction_type='expense',
            status='paid'
        ).with_entities(db.func.sum(Transaction.amount)).scalar() or 0
    
    def to_dict(self, include_relations=False):
        """Model'i sözlük olarak döndürür"""
        data = {
            'id': self.id,
            'case_number': self.case_number,
            'client_id': self.client_id,
            'lawyer_id': self.lawyer_id,
            'case_type': self.case_type,
            'case_type_display': self.case_type_display,
            'court_name': self.court_name,
            'subject': self.subject,
            'opposing_party': self.opposing_party,
            'status': self.status,
            'status_display': self.status_display,
            'is_active': self.is_active,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'next_hearing_date': self.next_hearing_date.isoformat() if self.next_hearing_date else None,
            'case_value': float(self.case_value) if self.case_value else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relations:
            data['client'] = self.client.to_dict() if self.client else None
            data['lawyer'] = self.assigned_lawyer.to_dict() if self.assigned_lawyer else None
            data['total_income'] = float(self.total_income)
            data['total_expense'] = float(self.total_expense)
        
        return data
    
    def __repr__(self):
        return f'<Case {self.case_number}>'
