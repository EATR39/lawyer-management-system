# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Müvekkil Routes
Müvekkil CRUD işlemleri endpoint'leri.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Client, User
from app.utils.decorators import role_required

clients_bp = Blueprint('clients', __name__)


@clients_bp.route('', methods=['GET'])
@jwt_required()
def get_clients():
    """
    Müvekkil listesi
    
    Query Parameters:
        page: Sayfa numarası (varsayılan: 1)
        per_page: Sayfa başına kayıt (varsayılan: 10)
        search: Arama terimi
        status: Durum filtresi
        sort: Sıralama alanı
        order: Sıralama yönü (asc/desc)
    
    Returns:
        clients: Müvekkil listesi
        total: Toplam kayıt sayısı
        pages: Toplam sayfa sayısı
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config['ITEMS_PER_PAGE'], type=int)
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    sort = request.args.get('sort', 'created_at')
    order = request.args.get('order', 'desc')
    
    # Temel sorgu
    query = Client.query
    
    # Arama filtresi
    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                Client.name.ilike(search_filter),
                Client.surname.ilike(search_filter),
                Client.email.ilike(search_filter),
                Client.phone.ilike(search_filter),
                Client.tc_no.ilike(search_filter)
            )
        )
    
    # Durum filtresi
    if status:
        query = query.filter(Client.status == status)
    
    # Sıralama
    sort_column = getattr(Client, sort, Client.created_at)
    if order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Sayfalama
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'clients': [c.to_dict(include_relations=True) for c in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@clients_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_client(id):
    """
    Tek müvekkil detayı
    
    Args:
        id: Müvekkil ID'si
    
    Returns:
        client: Müvekkil detayları
    """
    client = Client.query.get_or_404(id)
    return jsonify({
        'client': client.to_dict(include_relations=True)
    }), 200


@clients_bp.route('', methods=['POST'])
@jwt_required()
def create_client():
    """
    Yeni müvekkil oluştur
    
    Request Body:
        tc_no: TC Kimlik No
        name: Ad
        surname: Soyad
        email: E-posta
        phone: Telefon
        address: Adres
        birth_date: Doğum tarihi
        occupation: Meslek
        notes: Notlar
        status: Durum
    
    Returns:
        client: Oluşturulan müvekkil
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    # Gerekli alanları kontrol et
    if not data.get('name') or not data.get('surname'):
        return jsonify({'message': 'Ad ve soyad gereklidir'}), 400
    
    # TC kimlik kontrolü
    tc_no = data.get('tc_no', '').strip()
    if tc_no:
        existing = Client.query.filter_by(tc_no=tc_no).first()
        if existing:
            return jsonify({'message': 'Bu TC kimlik numarası zaten kayıtlı'}), 400
    
    # Müvekkil oluştur
    client = Client(
        tc_no=tc_no or None,
        name=data.get('name', '').strip(),
        surname=data.get('surname', '').strip(),
        email=data.get('email', '').strip().lower() or None,
        phone=data.get('phone', '').strip() or None,
        address=data.get('address', '').strip() or None,
        occupation=data.get('occupation', '').strip() or None,
        notes=data.get('notes', '').strip() or None,
        status=data.get('status', 'active'),
        created_by=current_user_id
    )
    
    # Doğum tarihi
    birth_date = data.get('birth_date')
    if birth_date:
        from datetime import datetime
        try:
            client.birth_date = datetime.fromisoformat(birth_date.replace('Z', '+00:00')).date()
        except ValueError:
            pass
    
    db.session.add(client)
    db.session.commit()
    
    return jsonify({
        'message': 'Müvekkil başarıyla oluşturuldu',
        'client': client.to_dict()
    }), 201


@clients_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_client(id):
    """
    Müvekkil güncelle
    
    Args:
        id: Müvekkil ID'si
    
    Returns:
        client: Güncellenen müvekkil
    """
    client = Client.query.get_or_404(id)
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    # TC kimlik kontrolü
    tc_no = data.get('tc_no', '').strip()
    if tc_no and tc_no != client.tc_no:
        existing = Client.query.filter_by(tc_no=tc_no).first()
        if existing:
            return jsonify({'message': 'Bu TC kimlik numarası zaten kayıtlı'}), 400
        client.tc_no = tc_no
    
    # Alanları güncelle
    if 'name' in data:
        client.name = data['name'].strip()
    if 'surname' in data:
        client.surname = data['surname'].strip()
    if 'email' in data:
        client.email = data['email'].strip().lower() or None
    if 'phone' in data:
        client.phone = data['phone'].strip() or None
    if 'address' in data:
        client.address = data['address'].strip() or None
    if 'occupation' in data:
        client.occupation = data['occupation'].strip() or None
    if 'notes' in data:
        client.notes = data['notes'].strip() or None
    if 'status' in data:
        client.status = data['status']
    
    # Doğum tarihi
    if 'birth_date' in data:
        birth_date = data.get('birth_date')
        if birth_date:
            from datetime import datetime
            try:
                client.birth_date = datetime.fromisoformat(birth_date.replace('Z', '+00:00')).date()
            except ValueError:
                pass
        else:
            client.birth_date = None
    
    db.session.commit()
    
    return jsonify({
        'message': 'Müvekkil başarıyla güncellendi',
        'client': client.to_dict()
    }), 200


@clients_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'lawyer'])
def delete_client(id):
    """
    Müvekkil sil
    
    Args:
        id: Müvekkil ID'si
    """
    client = Client.query.get_or_404(id)
    
    # İlişkili kayıtları kontrol et
    if client.cases.count() > 0:
        return jsonify({'message': 'Bu müvekkilin aktif davaları var, silinemez'}), 400
    
    db.session.delete(client)
    db.session.commit()
    
    return jsonify({'message': 'Müvekkil başarıyla silindi'}), 200


@clients_bp.route('/<int:id>/cases', methods=['GET'])
@jwt_required()
def get_client_cases(id):
    """
    Müvekkilin davalarını listele
    
    Args:
        id: Müvekkil ID'si
    """
    client = Client.query.get_or_404(id)
    cases = client.cases.all()
    
    return jsonify({
        'cases': [c.to_dict() for c in cases]
    }), 200


@clients_bp.route('/<int:id>/transactions', methods=['GET'])
@jwt_required()
def get_client_transactions(id):
    """
    Müvekkilin finansal işlemlerini listele
    
    Args:
        id: Müvekkil ID'si
    """
    client = Client.query.get_or_404(id)
    transactions = client.transactions.all()
    
    return jsonify({
        'transactions': [t.to_dict() for t in transactions]
    }), 200
