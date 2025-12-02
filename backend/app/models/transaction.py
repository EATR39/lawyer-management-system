# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Finansal İşlem Modelleri
İşlem ve taksit veritabanı modellerini tanımlar.
"""

from datetime import datetime
from app import db


class Transaction(db.Model):
    """
    Finansal işlem modeli
    
    Attributes:
        id: Benzersiz işlem kimliği
        transaction_type: İşlem tipi (income, expense)
        category: Kategori
        amount: Miktar
        currency: Para birimi
        date: İşlem tarihi
        payment_method: Ödeme yöntemi
        client_id: Müvekkil ID'si
        case_id: Dava ID'si
        status: Ödeme durumu
        receipt_no: Makbuz numarası
        description: Açıklama
        created_at: Oluşturulma tarihi
        updated_at: Güncellenme tarihi
    """
    
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_type = db.Column(db.String(20), nullable=False)  # income, expense
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    currency = db.Column(db.String(3), default='TRY')
    date = db.Column(db.Date, default=datetime.utcnow)
    payment_method = db.Column(db.String(50))
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'))
    case_id = db.Column(db.Integer, db.ForeignKey('cases.id'))
    status = db.Column(db.String(20), default='pending')  # pending, paid, cancelled
    receipt_no = db.Column(db.String(50))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    installments = db.relationship('Installment', backref='transaction', lazy='dynamic', cascade='all, delete-orphan')
    
    # İşlem tipleri
    TRANSACTION_TYPES = {
        'income': 'Gelir',
        'expense': 'Gider'
    }
    
    # Gelir kategorileri
    INCOME_CATEGORIES = {
        'consultation_fee': 'Danışmanlık Ücreti',
        'case_fee': 'Dava Ücreti',
        'retainer_fee': 'Avans',
        'court_expense_refund': 'Mahkeme Masrafı İadesi',
        'other_income': 'Diğer Gelir'
    }
    
    # Gider kategorileri
    EXPENSE_CATEGORIES = {
        'court_expense': 'Mahkeme Masrafı',
        'travel_expense': 'Seyahat Masrafı',
        'office_expense': 'Ofis Masrafı',
        'personnel_expense': 'Personel Gideri',
        'tax_payment': 'Vergi Ödemesi',
        'other_expense': 'Diğer Gider'
    }
    
    # Ödeme yöntemleri
    PAYMENT_METHODS = {
        'cash': 'Nakit',
        'bank_transfer': 'Banka Havalesi',
        'credit_card': 'Kredi Kartı',
        'check': 'Çek'
    }
    
    # Durumlar
    STATUSES = {
        'pending': 'Beklemede',
        'paid': 'Ödendi',
        'cancelled': 'İptal Edildi',
        'partial': 'Kısmi Ödeme'
    }
    
    @property
    def transaction_type_display(self):
        """İşlem tipi görüntü adını döndürür"""
        return self.TRANSACTION_TYPES.get(self.transaction_type, self.transaction_type)
    
    @property
    def category_display(self):
        """Kategori görüntü adını döndürür"""
        all_categories = {**self.INCOME_CATEGORIES, **self.EXPENSE_CATEGORIES}
        return all_categories.get(self.category, self.category)
    
    @property
    def payment_method_display(self):
        """Ödeme yöntemi görüntü adını döndürür"""
        return self.PAYMENT_METHODS.get(self.payment_method, self.payment_method)
    
    @property
    def status_display(self):
        """Durum görüntü adını döndürür"""
        return self.STATUSES.get(self.status, self.status)
    
    @property
    def paid_amount(self):
        """Ödenen toplam miktarı döndürür"""
        return self.installments.filter_by(status='paid').with_entities(
            db.func.sum(Installment.amount)
        ).scalar() or 0
    
    @property
    def remaining_amount(self):
        """Kalan miktarı döndürür"""
        return float(self.amount) - float(self.paid_amount)
    
    def to_dict(self, include_relations=False):
        """Model'i sözlük olarak döndürür"""
        data = {
            'id': self.id,
            'transaction_type': self.transaction_type,
            'transaction_type_display': self.transaction_type_display,
            'category': self.category,
            'category_display': self.category_display,
            'amount': float(self.amount),
            'currency': self.currency,
            'date': self.date.isoformat() if self.date else None,
            'payment_method': self.payment_method,
            'payment_method_display': self.payment_method_display,
            'client_id': self.client_id,
            'case_id': self.case_id,
            'status': self.status,
            'status_display': self.status_display,
            'receipt_no': self.receipt_no,
            'description': self.description,
            'paid_amount': float(self.paid_amount),
            'remaining_amount': float(self.remaining_amount),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_relations:
            data['client'] = self.client.to_dict() if self.client else None
            data['case'] = self.case.to_dict() if self.case else None
            data['installments'] = [i.to_dict() for i in self.installments.all()]
        
        return data
    
    def __repr__(self):
        return f'<Transaction {self.id} - {self.transaction_type}>'


class Installment(db.Model):
    """
    Taksit modeli
    
    Attributes:
        id: Benzersiz taksit kimliği
        transaction_id: İşlem ID'si
        installment_number: Taksit numarası
        amount: Taksit miktarı
        due_date: Vade tarihi
        paid_date: Ödeme tarihi
        status: Ödeme durumu
        notes: Notlar
    """
    
    __tablename__ = 'installments'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=False)
    installment_number = db.Column(db.Integer, nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    paid_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='pending')  # pending, paid, overdue
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Durumlar
    STATUSES = {
        'pending': 'Beklemede',
        'paid': 'Ödendi',
        'overdue': 'Vadesi Geçmiş'
    }
    
    @property
    def status_display(self):
        """Durum görüntü adını döndürür"""
        return self.STATUSES.get(self.status, self.status)
    
    @property
    def is_overdue(self):
        """Vadenin geçip geçmediğini kontrol eder"""
        if self.status == 'paid':
            return False
        return self.due_date < datetime.utcnow().date()
    
    def to_dict(self):
        """Model'i sözlük olarak döndürür"""
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'installment_number': self.installment_number,
            'amount': float(self.amount),
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_date': self.paid_date.isoformat() if self.paid_date else None,
            'status': self.status,
            'status_display': self.status_display,
            'is_overdue': self.is_overdue,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Installment {self.id} - Transaction {self.transaction_id}>'
