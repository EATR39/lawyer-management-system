# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Finans Routes
Finansal işlem CRUD endpoint'leri.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func
from app import db
from app.models import Transaction, Installment, Client, Case
from app.utils.decorators import role_required

finance_bp = Blueprint('finance', __name__)


@finance_bp.route('', methods=['GET'])
@jwt_required()
def get_transactions():
    """
    İşlem listesi
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config['ITEMS_PER_PAGE'], type=int)
    transaction_type = request.args.get('type', '')
    status = request.args.get('status', '')
    client_id = request.args.get('client_id', type=int)
    case_id = request.args.get('case_id', type=int)
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')
    sort = request.args.get('sort', 'date')
    order = request.args.get('order', 'desc')
    
    query = Transaction.query
    
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if status:
        query = query.filter(Transaction.status == status)
    if client_id:
        query = query.filter(Transaction.client_id == client_id)
    if case_id:
        query = query.filter(Transaction.case_id == case_id)
    
    if start_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00')).date()
            query = query.filter(Transaction.date >= start)
        except ValueError:
            pass
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00')).date()
            query = query.filter(Transaction.date <= end)
        except ValueError:
            pass
    
    sort_column = getattr(Transaction, sort, Transaction.date)
    if order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'transactions': [t.to_dict(include_relations=True) for t in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@finance_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_transaction(id):
    """
    Tek işlem detayı
    """
    transaction = Transaction.query.get_or_404(id)
    return jsonify({
        'transaction': transaction.to_dict(include_relations=True)
    }), 200


@finance_bp.route('', methods=['POST'])
@jwt_required()
def create_transaction():
    """
    Yeni işlem oluştur
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if not data.get('transaction_type'):
        return jsonify({'message': 'İşlem tipi gereklidir'}), 400
    if not data.get('category'):
        return jsonify({'message': 'Kategori gereklidir'}), 400
    if not data.get('amount'):
        return jsonify({'message': 'Miktar gereklidir'}), 400
    
    transaction = Transaction(
        transaction_type=data['transaction_type'],
        category=data['category'],
        amount=float(data['amount']),
        currency=data.get('currency', 'TRY'),
        payment_method=data.get('payment_method'),
        client_id=data.get('client_id'),
        case_id=data.get('case_id'),
        status=data.get('status', 'pending'),
        receipt_no=data.get('receipt_no', '').strip() or None,
        description=data.get('description', '').strip() or None
    )
    
    if data.get('date'):
        try:
            transaction.date = datetime.fromisoformat(data['date'].replace('Z', '+00:00')).date()
        except ValueError:
            transaction.date = datetime.utcnow().date()
    
    db.session.add(transaction)
    db.session.commit()
    
    # Taksitler
    if data.get('installments') and isinstance(data['installments'], list):
        for i, inst_data in enumerate(data['installments'], 1):
            installment = Installment(
                transaction_id=transaction.id,
                installment_number=i,
                amount=float(inst_data.get('amount', 0)),
                status=inst_data.get('status', 'pending')
            )
            if inst_data.get('due_date'):
                try:
                    installment.due_date = datetime.fromisoformat(inst_data['due_date'].replace('Z', '+00:00')).date()
                except ValueError:
                    pass
            db.session.add(installment)
        db.session.commit()
    
    return jsonify({
        'message': 'İşlem başarıyla oluşturuldu',
        'transaction': transaction.to_dict(include_relations=True)
    }), 201


@finance_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_transaction(id):
    """
    İşlem güncelle
    """
    transaction = Transaction.query.get_or_404(id)
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    if 'transaction_type' in data:
        transaction.transaction_type = data['transaction_type']
    if 'category' in data:
        transaction.category = data['category']
    if 'amount' in data:
        transaction.amount = float(data['amount'])
    if 'currency' in data:
        transaction.currency = data['currency']
    if 'payment_method' in data:
        transaction.payment_method = data['payment_method']
    if 'client_id' in data:
        transaction.client_id = data['client_id']
    if 'case_id' in data:
        transaction.case_id = data['case_id']
    if 'status' in data:
        transaction.status = data['status']
    if 'receipt_no' in data:
        transaction.receipt_no = data['receipt_no'].strip() or None
    if 'description' in data:
        transaction.description = data['description'].strip() or None
    
    if 'date' in data:
        if data['date']:
            try:
                transaction.date = datetime.fromisoformat(data['date'].replace('Z', '+00:00')).date()
            except ValueError:
                pass
    
    db.session.commit()
    
    return jsonify({
        'message': 'İşlem başarıyla güncellendi',
        'transaction': transaction.to_dict(include_relations=True)
    }), 200


@finance_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'lawyer'])
def delete_transaction(id):
    """
    İşlem sil
    """
    transaction = Transaction.query.get_or_404(id)
    db.session.delete(transaction)
    db.session.commit()
    
    return jsonify({'message': 'İşlem başarıyla silindi'}), 200


@finance_bp.route('/report', methods=['GET'])
@jwt_required()
def get_report():
    """
    Finansal rapor
    """
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')
    
    # Varsayılan: son 30 gün
    if not start_date:
        start = datetime.utcnow().date() - timedelta(days=30)
    else:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00')).date()
        except ValueError:
            start = datetime.utcnow().date() - timedelta(days=30)
    
    if not end_date:
        end = datetime.utcnow().date()
    else:
        try:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00')).date()
        except ValueError:
            end = datetime.utcnow().date()
    
    # Toplam gelir
    total_income = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == 'income',
        Transaction.status == 'paid',
        Transaction.date >= start,
        Transaction.date <= end
    ).scalar() or 0
    
    # Toplam gider
    total_expense = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == 'expense',
        Transaction.status == 'paid',
        Transaction.date >= start,
        Transaction.date <= end
    ).scalar() or 0
    
    # Bekleyen gelirler
    pending_income = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == 'income',
        Transaction.status == 'pending'
    ).scalar() or 0
    
    # Bekleyen giderler
    pending_expense = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == 'expense',
        Transaction.status == 'pending'
    ).scalar() or 0
    
    # Kategoriye göre gelirler
    income_by_category = db.session.query(
        Transaction.category,
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.transaction_type == 'income',
        Transaction.status == 'paid',
        Transaction.date >= start,
        Transaction.date <= end
    ).group_by(Transaction.category).all()
    
    # Kategoriye göre giderler
    expense_by_category = db.session.query(
        Transaction.category,
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.transaction_type == 'expense',
        Transaction.status == 'paid',
        Transaction.date >= start,
        Transaction.date <= end
    ).group_by(Transaction.category).all()
    
    return jsonify({
        'period': {
            'start': start.isoformat(),
            'end': end.isoformat()
        },
        'summary': {
            'total_income': float(total_income),
            'total_expense': float(total_expense),
            'net_profit': float(total_income - total_expense),
            'pending_income': float(pending_income),
            'pending_expense': float(pending_expense)
        },
        'income_by_category': [
            {'category': cat, 'total': float(total)} 
            for cat, total in income_by_category
        ],
        'expense_by_category': [
            {'category': cat, 'total': float(total)} 
            for cat, total in expense_by_category
        ]
    }), 200


@finance_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    """
    Kategorileri listele
    """
    return jsonify({
        'income_categories': Transaction.INCOME_CATEGORIES,
        'expense_categories': Transaction.EXPENSE_CATEGORIES,
        'payment_methods': Transaction.PAYMENT_METHODS
    }), 200


@finance_bp.route('/<int:id>/installments', methods=['GET'])
@jwt_required()
def get_installments(id):
    """
    İşlemin taksitlerini listele
    """
    transaction = Transaction.query.get_or_404(id)
    installments = transaction.installments.order_by(Installment.installment_number).all()
    
    return jsonify({
        'installments': [i.to_dict() for i in installments]
    }), 200


@finance_bp.route('/<int:id>/installments/<int:inst_id>', methods=['PUT'])
@jwt_required()
def update_installment(id, inst_id):
    """
    Taksit güncelle
    """
    transaction = Transaction.query.get_or_404(id)
    installment = Installment.query.filter_by(id=inst_id, transaction_id=id).first_or_404()
    
    data = request.get_json()
    
    if 'status' in data:
        installment.status = data['status']
        if data['status'] == 'paid' and not installment.paid_date:
            installment.paid_date = datetime.utcnow().date()
    
    if 'paid_date' in data:
        if data['paid_date']:
            try:
                installment.paid_date = datetime.fromisoformat(data['paid_date'].replace('Z', '+00:00')).date()
            except ValueError:
                pass
    
    if 'notes' in data:
        installment.notes = data['notes']
    
    db.session.commit()
    
    # Ana işlem durumunu güncelle
    all_installments = transaction.installments.all()
    paid_count = sum(1 for i in all_installments if i.status == 'paid')
    
    if paid_count == len(all_installments):
        transaction.status = 'paid'
    elif paid_count > 0:
        transaction.status = 'partial'
    
    db.session.commit()
    
    return jsonify({
        'message': 'Taksit güncellendi',
        'installment': installment.to_dict()
    }), 200
